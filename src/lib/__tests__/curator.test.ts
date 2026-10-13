import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { basicKeywords } from "../keywords";
import { checkAgainstRecords, proposeExhibition } from "../exhibition";
import { describeFetchError, normalizeMetObject, rankObjects, type MetObject } from "../met";

// A record in the exact shape the Met API returns (abridged).
const RAW_COIN = {
  objectID: 101,
  isPublicDomain: true,
  primaryImage: "https://images.metmuseum.org/large.jpg",
  primaryImageSmall: "https://images.metmuseum.org/small.jpg",
  department: "Greek and Roman Art",
  objectName: "Coin",
  title: "",
  culture: "Greek",
  period: "",
  dynasty: "Classical",
  artistDisplayName: "",
  objectDate: "ca. 400 B.C.",
  medium: "Silver",
  dimensions: "diam. 2 cm",
  city: "",
  region: "Attica",
  country: "Greece",
  tags: [{ term: "Coins" }, { term: "" }],
  objectURL: "",
};

function obj(id: number, overrides: Partial<MetObject> = {}): MetObject {
  return { ...normalizeMetObject({ ...RAW_COIN, objectID: id }), ...overrides };
}

describe("normalizeMetObject", () => {
  it("keeps museum values and fills gaps without inventing data", () => {
    const o = normalizeMetObject(RAW_COIN);
    expect(o.title).toBe("Coin"); // falls back to the record's own object name
    expect(o.artist).toBeNull(); // empty string becomes null, not "Unknown artist"
    expect(o.period).toBe("Classical");
    expect(o.geography).toBe("Attica, Greece");
    expect(o.tags).toEqual(["Coins"]);
    expect(o.image).toBe("https://images.metmuseum.org/small.jpg");
    expect(o.url).toBe("https://www.metmuseum.org/art/collection/search/101");
  });
});

describe("rankObjects", () => {
  it("puts public-domain objects with images first, keeping relevance order", () => {
    const ranked = rankObjects([
      obj(1, { image: null }),
      obj(2, { isPublicDomain: false }),
      obj(3),
      obj(4),
    ]);
    expect(ranked.map((o) => o.objectID)).toEqual([3, 4, 2, 1]);
  });
});

describe("basicKeywords", () => {
  it("uses the theme's own content words", () => {
    expect(basicKeywords("Currency and the Self")).toEqual(["currency self", "currency", "self"]);
  });
});

const PROPOSAL = {
  sufficient: true,
  insufficiencyNote: "",
  title: "Test",
  argument: "An argument.",
  narrative: "One.\n\nTwo.",
  sections: [
    {
      title: "Section A",
      summary: "…",
      objects: [
        { objectId: 1, whyItBelongs: "a", contribution: "b" },
        { objectId: 999, whyItBelongs: "invented", contribution: "invented" },
      ],
    },
    {
      title: "Section B",
      summary: "…",
      objects: [
        { objectId: 1, whyItBelongs: "duplicate", contribution: "duplicate" },
        { objectId: 2, whyItBelongs: "c", contribution: "d" },
      ],
    },
  ],
  connections: [
    { kind: "tension" as const, objectIds: [1, 2], note: "real" },
    { kind: "connection" as const, objectIds: [999], note: "invented" },
  ],
  caveats: [],
};

describe("checkAgainstRecords", () => {
  it("removes objects that were not retrieved from the Met and reports it", () => {
    const checked = checkAgainstRecords(PROPOSAL, [obj(1), obj(2), obj(3)]);
    expect(checked.sections[0].objects.map((o) => o.objectId)).toEqual([1]);
    expect(checked.sections[1].objects.map((o) => o.objectId)).toEqual([2]);
    expect(checked.connections).toHaveLength(1);
    expect(checked.warnings.join(" ")).toContain("999");
    expect(checked.unplacedObjectIds).toEqual([3]);
  });
});

// Exercises the real Anthropic SDK call against a local stand-in server, to
// check the request we send and how the response is parsed and verified.
describe("proposeExhibition (request shape)", () => {
  let server: Server;
  let captured: { headers: Record<string, unknown>; body: Record<string, unknown> } | null = null;

  beforeAll(async () => {
    server = createServer((req, res) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => {
        captured = { headers: req.headers, body: JSON.parse(data) };
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            id: "msg_test",
            type: "message",
            role: "assistant",
            model: "claude-opus-5-5",
            content: [{ type: "text", text: JSON.stringify(PROPOSAL) }],
            stop_reason: "end_turn",
            stop_sequence: null,
            usage: { input_tokens: 1, output_tokens: 1 },
          }),
        );
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => server.close());

  it("sends only the supplied records and strips invented IDs from the reply", async () => {
    const result = await proposeExhibition("Currency and the Self", [obj(1), obj(2), obj(3)]);
    const body = captured!.body;
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.fallbacks).toBe("default");
    expect(String(captured!.headers["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
    expect(body.output_config).toMatchObject({ effort: "medium", format: { type: "json_schema" } });
    const userText = (body.messages as { content: string }[])[0].content;
    expect(userText).toContain('"objectID": 1');
    expect(userText).not.toContain("images.metmuseum.org"); // no image URLs sent
    expect(result.sections[0].objects.map((o) => o.objectId)).toEqual([1]);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// Uses genuine failed connections (nothing mocked) to check the error text.
describe("describeFetchError", () => {
  async function failure(url: string): Promise<unknown> {
    try {
      await fetch(url, { signal: AbortSignal.timeout(5000) });
    } catch (error) {
      return error;
    }
    throw new Error("expected the request to fail");
  }

  it("explains a refused connection instead of just 'fetch failed'", async () => {
    // Grab a free port, then close it so nothing is listening there.
    const probe = createServer();
    await new Promise<void>((resolve) => probe.listen(0, "127.0.0.1", resolve));
    const { port } = probe.address() as AddressInfo;
    await new Promise((resolve) => probe.close(resolve));
    expect(describeFetchError(await failure(`http://127.0.0.1:${port}/`))).toBe(
      "the connection was refused",
    );
  });

  it("explains a server name that cannot be found", async () => {
    expect(describeFetchError(await failure("https://museum.invalid/"))).toContain(
      "could not be found",
    );
  });
});
