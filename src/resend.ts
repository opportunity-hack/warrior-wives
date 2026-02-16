import { Event, User } from "@prisma/client";
import { Resend } from "resend";
import * as ics from "ics";
import { JoinedEventEmail } from "./components/emails/join-event";
import { NewEventEmail } from "./components/emails/new-event";
import prisma from "./prisma";
import CancelledEventEmail from "./components/emails/cancelled-event";
import UpdatedEventEmail from "./components/emails/updated-event";

const resend = new Resend(process.env.RESEND_API_KEY);

export const convertToICSDatetime = (date: Date): ics.DateTime => {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ];
};

export async function sendJoinEventEmail(
  user: User,
  event: Event,
  groupName: string
) {
  const location = !event.online ? event.location : undefined;
  const meetingLink = event.online ? event.meetingLink : undefined;

  try {
    const { error, value } = ics.createEvent({
      start: convertToICSDatetime(event.startDateTime),
      end: convertToICSDatetime(event.endDateTime),
      title: event.name,
      description: event.description,
      location: location ?? undefined,
      organizer: {
        name: groupName ?? undefined,
        email: process.env.NOTIFICATIONS_EMAIL,
      },
      url: meetingLink ?? undefined,
    });
    if (error) {
      throw error;
    }
    const data = await resend.emails.send({
      react: JoinedEventEmail({
        name: user.name as string,
        eventName: event.name,
        eventUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/groups/${event.groupId}/events/${event.id}`,
      }),
      from: `Warrior Wives <${process.env.NOTIFICATIONS_EMAIL}>`,
      to: [user.email as string],
      subject: `See you at ${event.name}!`,
      attachments: [
        {
          filename: "calendar.ics",
          content: value,
        },
      ],
    });
    if (data.error) {
      throw data.error;
    }
    return data;
  } catch (error) {
    return error;
  }
}

export async function sendNewEventEmail(
  members: {
    email: string;
    name: string;
  }[],
  event: Event,
  groupName: string
) {
  try {
    await prisma.event.update({
      where: {
        id: event.id,
      },
      data: {
        sendEmailStatus: "IN_PROGRESS",
      },
    });

    members.forEach(async (member) => {
      try {
        const data = await resend.emails.send({
          react: NewEventEmail({
            name: member.name,
            groupName,
            eventName: event.name,
            eventUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/groups/${event.groupId}/events/${event.id}`,
          }),
          from: `Warrior Wives <${process.env.NOTIFICATIONS_EMAIL}>`,
          to: [member.email],
          subject: `📅 Just scheduled: ${event.name}`,
        });
        if (data.error) {
          console.log(data.error);
        }
      } catch (error) {
        console.log(error);
      }
    });

    await prisma.event.update({
      where: {
        id: event.id,
      },
      data: {
        sendEmailStatus: "SENT",
      },
    });
  } catch (error) {
    console.log(error);
  }
}

export async function sendCancelledEventEmail(
  members: {
    email: string;
    name: string;
  }[],
  event: Event,
  groupName: string
) {
  try {
    members.forEach(async (member) => {
      try {
        const data = await resend.emails.send({
          react: CancelledEventEmail({
            name: member.name,
            groupName,
            eventName: event.name,
            groupUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/groups/${event.groupId}`,
          }),
          from: `Warrior Wives <${process.env.NOTIFICATIONS_EMAIL}>`,
          to: [member.email],
          subject: `❌ Event Canceled: ${event.name}`,
        });
        if (data.error) {
          console.log(data.error);
        }
      } catch (error) {
        console.log(error);
      }
    });
  } catch (error) {
    console.log(error);
  }
}

export async function sendUpdatedEventEmail(event: Event, groupName: string) {
  const eventWithMembersData = await prisma.event.findUnique({
    where: {
      id: event.id,
    },
    include: {
      attendees: {
        select: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
      organizers: {
        select: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!eventWithMembersData) return;
  if (!eventWithMembersData.sendUpdateEmail) return;

  const attendees = eventWithMembersData.attendees.map((attendee) => {
    return {
      email: attendee.user.email,
      name: attendee.user.name,
    };
  });
  const organizers = eventWithMembersData.organizers.map((organizer) => {
    return {
      email: organizer.user.email,
      name: organizer.user.name,
    };
  });
  const members = [...attendees, ...organizers];

  const location = !eventWithMembersData.online
    ? eventWithMembersData.location
    : undefined;
  const meetingLink = eventWithMembersData.online
    ? eventWithMembersData.meetingLink
    : undefined;

  try {
    const { error, value } = ics.createEvent({
      start: convertToICSDatetime(eventWithMembersData.startDateTime),
      end: convertToICSDatetime(eventWithMembersData.endDateTime),
      title: eventWithMembersData.name,
      description: eventWithMembersData.description,
      location: location ?? undefined,
      organizer: {
        name: groupName ?? undefined,
        email: process.env.NOTIFICATIONS_EMAIL,
      },
      url: meetingLink ?? undefined,
    });
    if (error) {
      throw error;
    }
    try {
      members.forEach(async (member) => {
        try {
          const data = await resend.emails.send({
            react: UpdatedEventEmail({
              name: member.name as string,
              eventName: eventWithMembersData.name,
              eventUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/groups/${eventWithMembersData.groupId}/events/${eventWithMembersData.id}`,
            }),
            from: `Warrior Wives <${process.env.NOTIFICATIONS_EMAIL}>`,
            to: [member.email as string],
            subject: `📅 Updated Event: ${eventWithMembersData.name}`,
            attachments: [
              {
                filename: "calendar.ics",
                content: value,
              },
            ],
          });
          if (data.error) {
            console.log(data.error);
          }
        } catch (error) {
          console.log(error);
        }
      });
    } catch (error) {
      console.log(error);
    }

    await prisma.event.update({
      where: {
        id: event.id,
      },
      data: {
        sendUpdateEmail: false,
      },
    });
  } catch (error) {
    return error;
  }
}
