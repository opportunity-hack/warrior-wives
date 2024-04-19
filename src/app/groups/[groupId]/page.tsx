"use client";

import Tags from "@/components/common/tags";
import {
  Flex,
  SimpleGrid,
  Text,
  Image,
  Stack,
  Heading,
  Box,
  useMediaQuery,
  Badge,
  Spinner,
  useDisclosure,
} from "@chakra-ui/react";
import { MdPeopleAlt } from "react-icons/md";
import React, { useEffect, useState, useRef } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import IconText from "@/components/common/icontext";
import { BsPersonRaisedHand } from "react-icons/bs";
import { RiBaseStationFill } from "react-icons/ri";
import { SWRProvider } from "@/providers/swrProvider";
import useSWR, { KeyedMutator, SWRResponse } from "swr";
import GroupLoading from "./loading";
import GroupEventsData from "./components/GroupEventsData";
import { GroupEvents } from "@/app/api/groups/[groupId]/events/route";
import { GroupDataType } from "@/app/api/groups/[groupId]/route";
import GroupActionButtons from "./components/GroupActionButtons";
import { getUserRequestOptions } from "@/app/api/user/helper";
import { UserDataType } from "@/app/api/user/route";
import { notFound } from "next/navigation";
import { getGroupEventsRequestOptions } from "@/app/api/events/helper";
import { getSingleGroupRequestOptions } from "@/app/api/groups/helper";
import { TypographyH4 } from "@/components/ui/typography/h4";
import { TypographyH3 } from "@/components/ui/typography/h3";

function GroupData({
  group,
  events,
  user,
  revalidateData,
}: {
  group: GroupDataType;
  events: SWRResponse<GroupEvents, any, any>;
  user: SWRResponse<UserDataType, any, any>;
  revalidateData: KeyedMutator<GroupDataType>;
}) {
  const [isSticky, setIsSticky] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(70);
  const [scrollSpeed, setScrollSpeed] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);

  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(window.scrollY > 70 ? window.scrollY : 70);
      setIsSticky(window.scrollY > 70);

      const scrollY = window.scrollY;
      const newScrollSpeed = Math.abs(scrollY - lastScrollY);
      setScrollSpeed(newScrollSpeed);
      setLastScrollY(scrollY);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    name,
    branchOfService,
    description,
    displayPhoto,
    tags,
    county,
    state,
    online,
    membersCount,
    admins,
  } = group;
  const displayPhotoUrl = displayPhoto || "/defaultGroupImage.jpg";
  const location = county ? `${county}, ${state}` : state;
  const parsedAdmins =
    admins.length > 2
      ? `${admins.slice(0, 2).join(", ")} and ${admins.length - 2} others`
      : admins.join(" and ");

  const cardMinWidth = 30;
  const cardWidth = 50 - scrollPosition / 15;

  const descMinWidth = 60;
  const descWidth = 100 - (isSticky ? scrollPosition / 3 : 0);

  const parsedBranchOfService =
    branchOfService === "Any" ? "All Branches" : branchOfService;
  const [desktopSize] = useMediaQuery("(min-width: 1024px)");

  return (
    <div className="flex flex-col-reverse md:flex-row gap-8 justify-between">
      <div className="flex flex-col gap-16">
        <Stack gap={8}>
          <SimpleGrid columns={[1, 1, 2]} spacing={8}>
            <Image
              src={displayPhotoUrl}
              alt={name}
              borderRadius="lg"
              className="w-full object-cover h-64 md:h-96"
            />
            <Box
              className={`${
                isSticky && desktopSize ? "bg-white rounded-xl border" : ""
              } ${!desktopSize && "bg-white"}  lg:fixed p-7 rounded-xl `}
              transition={
                "width 0.25s ease, background 0.5s ease, top 0.2s ease"
              }
              top={
                !isSticky && desktopSize
                  ? `calc(110px - ${scrollSpeed}px)`
                  : "48px"
              }
              right="48px"
              width={`${
                desktopSize &&
                (cardWidth > cardMinWidth ? cardWidth : cardMinWidth)
              }%`}
            >
              <Box>
                <Stack spacing={5}>
                  <Stack spacing={1}>
                    <span>
                      <Badge
                        w={"auto"}
                        className="px-[4px] py-[2px] rounded-sm"
                        colorScheme="gray"
                      >
                        {parsedBranchOfService}
                      </Badge>
                    </span>
                    <Heading className="heading mb-2">{name}</Heading>
                    <Tags tags={tags} />
                  </Stack>
                  <Stack spacing={2}>
                    {online && (
                      <IconText
                        icon={RiBaseStationFill}
                        iconClassName="text-green-500"
                        textClassName="uppercase text-green-500 font-bold"
                      >
                        ONLINE ONLY
                      </IconText>
                    )}
                    <IconText
                      icon={FaMapMarkerAlt}
                      iconClassName="text-red-700"
                      textClassName="font-semibold text-sm"
                    >
                      {location}
                    </IconText>
                    <IconText
                      icon={MdPeopleAlt}
                      iconClassName="text-blue-400"
                      textClassName="text-gray-500 text-sm"
                    >
                      {`${membersCount} members`}
                    </IconText>
                    <IconText
                      icon={BsPersonRaisedHand}
                      iconClassName="text-gray-500"
                      textClassName="text-gray-500 text-sm"
                    >
                      Organized by {parsedAdmins}
                    </IconText>
                  </Stack>
                  <GroupActionButtons
                    group={group}
                    user={user}
                    revalidateData={revalidateData}
                  />
                </Stack>
              </Box>
            </Box>
          </SimpleGrid>
          <Flex className="flex-col gap-4">
            <TypographyH4>Description</TypographyH4>
            <Text
              textOverflow={"ellipsis"}
              width={`${
                desktopSize &&
                (descWidth > descMinWidth ? descWidth : descMinWidth)
              }%`}
              transition={"width 0.25s ease"}
              ref={descriptionRef}
              className="break-words text-gray-700 whitespace-pre"
            >
              {description}
            </Text>
          </Flex>
        </Stack>
        <Stack gap={4}>
          <TypographyH3>Events from {name}</TypographyH3>
          <GroupEventsData events={events} />
        </Stack>
      </div>
    </div>
  );
}

function _GroupPage({ params }: { params: { groupId: string } }) {
  const groupId = params.groupId;
  const {
    data: group,
    error,
    isLoading,
    mutate,
  } = useSWR<GroupDataType>([
    `/groups/${groupId}`,
    getSingleGroupRequestOptions(groupId),
  ]);
  const events = useSWR<GroupEvents>([
    `/groups/${groupId}/events`,
    getGroupEventsRequestOptions(groupId),
  ]);
  const user = useSWR<UserDataType>(["/user", getUserRequestOptions()]);

  if (isLoading) return <GroupLoading />;
  if (error) return <div>Error loading group</div>;
  if (!group) return notFound();

  return (
    <GroupData
      group={group}
      events={events}
      user={user}
      revalidateData={mutate}
    />
  );
}

export default function GroupPage({ params }: { params: { groupId: string } }) {
  return (
    <SWRProvider>
      <_GroupPage params={params} />
    </SWRProvider>
  );
}
