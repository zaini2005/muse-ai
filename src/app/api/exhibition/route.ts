import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { isAiConfigured } from "@/lib/anthropic";
import { ExhibitionError, proposeExhibition } from "@/lib/exhibition";
import { MetApiError, getMetObjects } from "@/lib/met";
import type { ApiError, ProposalResponse } from "@/lib/types";

export const maxDuration = 300;

const MIN_OBJECTS = 3;
const MAX_OBJECTS = 30;

export async function POST(request: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json<ApiError>(
      {
        error:
          "Writing an exhibition proposal needs an Anthropic API key. Add ANTHROPIC_API_KEY to the .env.local file and restart the app.",
      },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const theme = typeof body?.theme === "string" ? body.theme.trim() : "";
  const ids: number[] = Array.isArray(body?.objectIds)
    ? [...new Set<number>(body.objectIds.filter(Number.isInteger))]
    : [];

  if (theme.length < 3 || theme.length > 500) {
    return NextResponse.json<ApiError>({ error: "A theme is required." }, { status: 400 });
  }
  if (ids.length < MIN_OBJECTS || ids.length > MAX_OBJECTS) {
    return NextResponse.json<ApiError>(
      { error: `Select between ${MIN_OBJECTS} and ${MAX_OBJECTS} objects.` },
      { status: 400 },
    );
  }

  // Re-fetch every record from the Met rather than trusting data sent by the
  // browser, so the AI only ever sees genuine museum records.
  let objects;
  try {
    objects = await getMetObjects(ids);
  } catch (error) {
    const message = error instanceof MetApiError ? error.message : "Could not load object records.";
    return NextResponse.json<ApiError>({ error: message }, { status: 502 });
  }
  if (objects.length < MIN_OBJECTS) {
    return NextResponse.json<ApiError>(
      { error: "Too few of the selected objects could be retrieved from The Met to build a proposal." },
      { status: 422 },
    );
  }

  try {
    const proposal = await proposeExhibition(theme, objects);
    return NextResponse.json<ProposalResponse>({ proposal, objects });
  } catch (error) {
    console.error("Exhibition proposal failed:", error);
    let message = "Something went wrong while writing the proposal. Please try again.";
    if (error instanceof ExhibitionError) message = error.message;
    else if (error instanceof Anthropic.AuthenticationError)
      message = "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY in .env.local.";
    else if (error instanceof Anthropic.RateLimitError)
      message = "The AI service is busy (rate limited). Please wait a minute and try again.";
    else if (error instanceof Anthropic.APIConnectionError)
      message = "Could not reach the AI service. Check your internet connection.";
    return NextResponse.json<ApiError>({ error: message }, { status: 502 });
  }
}
