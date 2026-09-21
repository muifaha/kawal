import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const filePathParts = resolvedParams.path;

    const candidateDirs: string[] = [];
    if (process.env.UPLOAD_DIR) {
      candidateDirs.push(path.resolve(process.env.UPLOAD_DIR));
    }
    candidateDirs.push(path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads"));
    candidateDirs.push(path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads"));

    let targetFilePath: string | null = null;
    let baseDirUsed: string | null = null;

    for (const dir of candidateDirs) {
      const candidate = path.join(dir, ...filePathParts);
      // Security check: prevent directory traversal attacks
      const relative = path.relative(dir, candidate);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        continue;
      }
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        targetFilePath = candidate;
        baseDirUsed = dir;
        break;
      }
    }

    if (!targetFilePath) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(targetFilePath);
    const ext = path.extname(targetFilePath).toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
    else if (ext === ".gif") contentType = "image/gif";
    else if (ext === ".svg") contentType = "image/svg+xml";
    else if (ext === ".webp") contentType = "image/webp";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error serving uploaded file:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
