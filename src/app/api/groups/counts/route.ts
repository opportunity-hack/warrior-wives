import { auth } from "@/auth";
import { UnauthenticatedError } from "@/lib/errors";
import prisma from "@/prisma";
import { GroupCounts } from "./types";

// get number of active groups per state and per county, for the map choropleth
export async function GET() {
  const session = await auth();
  const user = session?.user;
  if (!user) {
    throw new UnauthenticatedError();
  }

  const groups = await prisma.group.findMany({
    where: { archived: false },
    select: { state: true, county: true },
  });

  const counts: GroupCounts = { states: {}, counties: {} };
  groups.forEach((group) => {
    counts.states[group.state] = (counts.states[group.state] || 0) + 1;
    if (group.county) {
      counts.counties[group.county] = (counts.counties[group.county] || 0) + 1;
    }
  });

  return Response.json(counts);
}
