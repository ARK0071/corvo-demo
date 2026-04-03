import { NextRequest, NextResponse } from "next/server";
import { setTenantConfigFromHeaders } from "@/lib/db/tenant-config";
import * as DemoProjects from "@/lib/db/repositories/demo-projects";
import type { Project } from "@/data/projects";

// GET: List all projects or search with params
export async function GET(request: NextRequest) {
  try {
    // Set tenant config from request headers
    setTenantConfigFromHeaders(request.headers);

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    // If ID provided, return single project
    if (id) {
      const project = await DemoProjects.getProjectById(id);
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      return NextResponse.json(project);
    }

    // Otherwise, search with filters
    const keyword = searchParams.get("keyword") || undefined;
    const status = searchParams.getAll("status") as Project["status"][];
    const priority = searchParams.getAll("priority") as Project["priority"][];
    const projectType = searchParams.get("projectType") || undefined;
    const shovelReady = searchParams.get("shovelReady");
    const limit = searchParams.get("limit");
    const offset = searchParams.get("offset");

    const result = await DemoProjects.searchProjects({
      keyword,
      status: status.length > 0 ? status : undefined,
      priority: priority.length > 0 ? priority : undefined,
      projectType,
      shovelReady: shovelReady !== null ? shovelReady === "true" : undefined,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Projects GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST: Create a new project
export async function POST(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const body = await request.json();

    const { portProfileId, ...projectData } = body;

    if (!portProfileId) {
      return NextResponse.json(
        { error: "portProfileId is required" },
        { status: 400 }
      );
    }

    const project = await DemoProjects.createProject(projectData, portProfileId);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Projects POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create project" },
      { status: 500 }
    );
  }
}

// PUT: Update a project
export async function PUT(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const body = await request.json();

    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const project = await DemoProjects.updateProject(id, updates);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Projects PUT error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update project" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a project
export async function DELETE(request: NextRequest) {
  try {
    setTenantConfigFromHeaders(request.headers);
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const deleted = await DemoProjects.deleteProject(id);
    if (!deleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Projects DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete project" },
      { status: 500 }
    );
  }
}
