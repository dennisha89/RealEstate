import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { storeEvent } from "@/lib/events/event-store";

export const dynamic = "force-dynamic";

const VALID_EVENTS = [
  "market.viewed", "market.watched", "market.unwatched",
  "property.analyzed", "property.compared", "property.saved",
  "confluence.ran", "alert.created", "scenario.slider_moved",
  "workflow.step_completed", "rate.checked", "session.page_viewed",
] as const;

const eventItemSchema = z.object({
  event: z.enum(VALID_EVENTS),
  timestamp: z.string().datetime({ offset: true }),
  sessionId: z.string().uuid(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const ingestSchema = z.object({
  events: z.array(eventItemSchema).min(1).max(50),
});

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const parsed = ingestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { events } = parsed.data;

    for (const evt of events) {
      const zip = typeof evt.properties?.["zip"] === "string" ? (evt.properties["zip"] as string) : undefined;
      storeEvent({
        event: evt.event,
        timestamp: evt.timestamp,
        sessionId: evt.sessionId,
        zip,
        properties: evt.properties,
      });
    }

    return NextResponse.json({ ingested: events.length }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof SyntaxError ? "Malformed JSON body" : "Failed to ingest events";
    console.error("Event ingest error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
