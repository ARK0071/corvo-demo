"use client";

import { useEffect, useState, useCallback } from "react";
import { useTenantHeaders } from "@/contexts/tenant-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CalendarDays,
  FileText,
  MapPin,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  reportType: string;
  status: string;
}

interface Visit {
  id: string;
  type: string;
  scheduledDate: string;
  status: string;
  location: string | null;
  agenda: string;
  scheduledBy: { name: string };
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    user: { name: string; role: string };
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  received: "bg-emerald-100 text-emerald-700",
  proposed: "bg-blue-100 text-blue-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  completed: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
  rescheduled: "bg-amber-100 text-amber-700",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(d: string) {
  const diff = Math.ceil(
    (new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `${diff}d`;
}

export default function SubCalendar() {
  const headers = useTenantHeaders();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [rescheduleComment, setRescheduleComment] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const [dashRes, visitRes] = await Promise.all([
        fetch("/api/sub/dashboard", { headers }),
        fetch("/api/sub/visits", { headers }),
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json();
        setDeadlines(data.upcomingDeadlines || []);
      }
      if (visitRes.ok) {
        const data = await visitRes.json();
        setVisits(data.visits || []);
      }
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleConfirmVisit = async (visitId: string) => {
    await fetch("/api/sub/visits", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id: visitId, action: "confirm" }),
    });
    fetchAll();
    setSelectedVisit(null);
  };

  const handleRequestReschedule = async (visitId: string) => {
    if (!rescheduleComment.trim()) return;
    await fetch("/api/sub/visits", {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        id: visitId,
        action: "request_reschedule",
        comment: rescheduleComment,
      }),
    });
    setRescheduleComment("");
    fetchAll();
    setSelectedVisit(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading calendar...</p>
      </div>
    );
  }

  // Combine and sort all events
  const allEvents = [
    ...deadlines.map((d) => ({
      ...d,
      eventType: "deadline" as const,
      date: d.dueDate,
    })),
    ...visits.map((v) => ({
      ...v,
      eventType: "visit" as const,
      date: v.scheduledDate,
    })),
  ].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Group by month
  const byMonth: Record<string, typeof allEvents> = {};
  for (const event of allEvents) {
    const key = new Date(event.date).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(event);
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Deadlines, monitoring visits, and upcoming events
        </p>
      </div>

      {Object.keys(byMonth).length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No upcoming events
          </CardContent>
        </Card>
      ) : (
        Object.entries(byMonth).map(([month, events]) => (
          <Card key={month}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {month}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {events.map((event) => (
                <div
                  key={`${event.eventType}-${event.id}`}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    event.eventType === "visit"
                      ? "cursor-pointer hover:bg-muted/50"
                      : ""
                  }`}
                  onClick={() => {
                    if (event.eventType === "visit") {
                      const visit = visits.find((v) => v.id === event.id);
                      if (visit) setSelectedVisit(visit);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {event.eventType === "deadline" ? (
                      <FileText className="h-4 w-4 text-amber-500 mt-0.5" />
                    ) : (
                      <MapPin className="h-4 w-4 text-blue-500 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {event.eventType === "deadline"
                          ? (event as Deadline & { eventType: "deadline"; date: string }).title
                          : `${(event as Visit & { eventType: "visit"; date: string }).type.replace(/_/g, " ")} visit`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(event.date)}
                        {event.eventType === "visit" &&
                          (event as Visit & { eventType: "visit"; date: string }).location &&
                          ` — ${(event as Visit & { eventType: "visit"; date: string }).location}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium ${
                        new Date(event.date) < new Date()
                          ? "text-red-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      {daysUntil(event.date)}
                    </span>
                    <Badge
                      className={
                        STATUS_COLORS[event.status] || "bg-gray-100 text-gray-700"
                      }
                    >
                      {event.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}

      {/* Visit Detail Sheet */}
      <Sheet
        open={!!selectedVisit}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedVisit(null);
            setRescheduleComment("");
          }
        }}
      >
        <SheetContent className="overflow-y-auto">
          {selectedVisit && (
            <>
              <SheetHeader>
                <SheetTitle className="capitalize">
                  {selectedVisit.type.replace(/_/g, " ")}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      STATUS_COLORS[selectedVisit.status] || ""
                    }
                  >
                    {selectedVisit.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Scheduled by {selectedVisit.scheduledBy.name}
                  </span>
                </div>

                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Date:</span>{" "}
                    {formatDate(selectedVisit.scheduledDate)}
                  </p>
                  {selectedVisit.location && (
                    <p>
                      <span className="text-muted-foreground">Location:</span>{" "}
                      {selectedVisit.location}
                    </p>
                  )}
                </div>

                {selectedVisit.agenda && (
                  <div>
                    <p className="text-sm font-medium mb-1">Agenda</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedVisit.agenda}
                    </p>
                  </div>
                )}

                {selectedVisit.status === "proposed" && (
                  <div className="space-y-2 p-3 border rounded-lg">
                    <p className="text-sm font-medium">Respond to Visit</p>
                    <Button
                      size="sm"
                      onClick={() => handleConfirmVisit(selectedVisit.id)}
                      className="w-full"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Confirm Visit
                    </Button>
                    <div className="space-y-1">
                      <Input
                        value={rescheduleComment}
                        onChange={(e) =>
                          setRescheduleComment(e.target.value)
                        }
                        placeholder="Reason for reschedule..."
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleRequestReschedule(selectedVisit.id)
                        }
                        disabled={!rescheduleComment.trim()}
                        className="w-full"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Request Reschedule
                      </Button>
                    </div>
                  </div>
                )}

                {/* Comments */}
                {selectedVisit.comments.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Comments</p>
                    <div className="space-y-2">
                      {selectedVisit.comments.map((c) => (
                        <div
                          key={c.id}
                          className="p-2 bg-muted rounded text-sm"
                        >
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <span className="font-medium">{c.user.name}</span>
                            <span>&middot;</span>
                            <span>{formatDate(c.createdAt)}</span>
                          </div>
                          <p>{c.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
