import {
  addWatchlistCode,
  getWatchlistCodes,
  removeWatchlistCode,
} from "../../../lib/watchlistStore.js";

export const dynamic = "force-dynamic";

function errorResponse(error, status = 500) {
  return Response.json({ error: error.message }, { status });
}

function statusForError(error) {
  return error.message === "Invalid stock code." ? 400 : 500;
}

export async function GET() {
  try {
    return Response.json({ codes: await getWatchlistCodes() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const codes = await addWatchlistCode(body?.stockCode);

    return Response.json({ codes });
  } catch (error) {
    return errorResponse(error, statusForError(error));
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const codes = await removeWatchlistCode(searchParams.get("stockCode"));

    return Response.json({ codes });
  } catch (error) {
    return errorResponse(error, statusForError(error));
  }
}
