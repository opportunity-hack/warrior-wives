"use client";

import React, { useRef, useEffect, useState } from "react";
import { Card, Flex } from "@chakra-ui/react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import axios from "axios";

import { Box, Checkbox, Spinner } from "@chakra-ui/react";
import { FaMapMarkedAlt } from "react-icons/fa";
import GroupCard from "../GroupCards";
import MapLoading from "./loading";
import IconText from "../common/icontext";
import { GroupData } from "@/app/api/groups/[groupId]/types";
import { GroupCounts } from "@/app/api/groups/counts/types";
import { SWRProvider } from "@/providers/swrProvider";
import useSWR from "swr";
import { Toggle } from "../ui/toggle";

const COUNTY_GEOJSON_URL =
  "https://gist.githubusercontent.com/sdwfrost/d1c73f91dd9d175998ed166eb216994a/raw/e89c35f308cee7e2e5a784e1d3afc5d449e9e4bb/counties.geojson";
const STATE_GEOJSON_URL =
  "https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json";

export function generateColorFromString(stateName: string, opacity: string) {
  let hash = 0;
  for (let i = 0; i < stateName.length; i++) {
    hash = stateName.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = hash * 31 + stateName.length;
  hash = hash * 17 + stateName.charCodeAt(stateName.length - 1);
  hash = hash & 0x7fffffff;
  return "#" + (hash | 0x44000000).toString(16).slice(1, 7) + opacity;
}

// single-hue sequential ramp: darker = more troops; gray = none
const TROOP_COLORS = {
  none: "#d1d5db",
  low: "#86b6ef", // 1 troop
  mid: "#3987e5", // 2-3 troops
  high: "#1c5cab", // 4+ troops
};

const LEGEND_ITEMS = [
  { color: TROOP_COLORS.none, label: "No troops", opacity: 0.6 },
  { color: TROOP_COLORS.low, label: "1 troop", opacity: 0.85 },
  { color: TROOP_COLORS.mid, label: "2–3 troops", opacity: 0.85 },
  { color: TROOP_COLORS.high, label: "4+ troops", opacity: 0.85 },
];

function colorForCount(count: number) {
  if (count >= 4) return TROOP_COLORS.high;
  if (count >= 2) return TROOP_COLORS.mid;
  if (count >= 1) return TROOP_COLORS.low;
  return TROOP_COLORS.none;
}

// data-driven paint expression: match a feature property against known counts
function buildMatchExpression(
  counts: Record<string, number>,
  property: string,
  valueForCount: (count: number) => string | number,
  fallback: string | number
) {
  const expression: any[] = ["match", ["get", property]];
  Object.entries(counts).forEach(([name, count]) => {
    if (name === "National" || name === "International") return;
    expression.push(name, valueForCount(count));
  });
  // a match expression is invalid without at least one branch
  if (expression.length === 2) return fallback;
  expression.push(fallback);
  return expression;
}

function tooltipHtml(name: string, count: number) {
  const label =
    count === 0 ? "No troops yet" : count === 1 ? "1 troop" : `${count} troops`;
  return `<div style="font-weight:600;font-size:13px;color:#1f2937">${name}</div><div style="font-size:12px;color:#4b5563">${label}</div>`;
}

const _Map = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<maptilersdk.Map | null>(null);
  const hoverPopup = useRef<maptilersdk.Popup | null>(null);
  maptilersdk.config.apiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY!;

  const [byCounty, setByCounty] = useState(false);
  const [stateGeoJsonData, setStateGeoJsonData] = useState(null);
  const [countyGeoJsonData, setCountyGeoJsonData] = useState(null);

  const [selectedState, setSelectedState] = useState("");
  const [selectedCounty, setSelectedCounty] = useState("");

  const [selectedNational, setSelectedNational] = useState(false);
  const [selectedInternational, setSelectedInternational] = useState(false);

  const [loading, setLoading] = useState(true);

  // refs so map event handlers (registered once) always read fresh values
  const stateCountsRef = useRef<Record<string, number>>({});
  const countyCountsRef = useRef<Record<string, number>>({});
  const byCountyRef = useRef(false);
  byCountyRef.current = byCounty;

  const countsFetchOptions: RequestInit = {
    next: { tags: ["group-counts"], revalidate: 60 * 5 },
  };
  const { data: groupCounts } = useSWR<GroupCounts, any>([
    "/groups/counts",
    countsFetchOptions,
  ]);

  const applyStateChoropleth = () => {
    if (!map.current?.getLayer("states-fill")) return;
    const counts = stateCountsRef.current;
    map.current.setPaintProperty(
      "states-fill",
      "fill-color",
      buildMatchExpression(counts, "name", colorForCount, TROOP_COLORS.none)
    );
    // in county mode only counties are shaded; hide the state fill so it
    // doesn't wash over the whole state (clicks on it still select the state)
    map.current.setPaintProperty(
      "states-fill",
      "fill-opacity",
      byCountyRef.current
        ? 0
        : buildMatchExpression(counts, "name", () => 0.6, 0.25)
    );
  };

  const applyCountyChoropleth = () => {
    if (!map.current?.getLayer("county-boundaries-fill")) return;
    const counts = countyCountsRef.current;
    map.current.setPaintProperty(
      "county-boundaries-fill",
      "fill-color",
      buildMatchExpression(counts, "NAME", colorForCount, "#000000")
    );
    map.current.setPaintProperty(
      "county-boundaries-fill",
      "fill-opacity",
      buildMatchExpression(counts, "NAME", () => 0.7, 0)
    );
  };

  useEffect(() => {
    if (!groupCounts) return;
    stateCountsRef.current = groupCounts.states;
    countyCountsRef.current = groupCounts.counties;
    if (!loading) {
      applyStateChoropleth();
      applyCountyChoropleth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupCounts, loading]);

  const addStateGeoJsonDataToMap = (geoJsonData: any) => {
    if (!geoJsonData || map.current!.getSource("state-boundaries")) return;

    map.current!.addSource("state-boundaries", {
      type: "geojson",
      data: geoJsonData,
    });

    map.current!.addLayer({
      id: "states-fill",
      type: "fill",
      source: "state-boundaries",
      paint: {
        "fill-color": TROOP_COLORS.none,
        "fill-opacity": 0.25,
      },
    });

    map.current!.addLayer({
      id: "states-line",
      type: "line",
      source: "state-boundaries",
      paint: {
        "line-color": "#ffffff",
        "line-width": 1,
      },
    });

    // outline for the currently selected state
    map.current!.addLayer({
      id: "states-selected",
      type: "line",
      source: "state-boundaries",
      paint: {
        "line-color": "#184f95",
        "line-width": 2.5,
      },
      filter: ["==", ["get", "name"], ""],
    });

    applyStateChoropleth();
  };

  const addCountyGeoJsonDataToMap = (geoJsonData: any) => {
    removeSourceAndLayers();
    if (!geoJsonData) return;

    map.current!.addSource("county-boundaries", {
      type: "geojson",
      data: geoJsonData,
    });

    map.current!.addLayer({
      id: `county-boundaries-fill`,
      type: "fill",
      source: "county-boundaries",
      paint: {
        "fill-opacity": 0,
      },
    });

    map.current!.addLayer({
      id: `county-boundaries-line`,
      type: "line",
      source: "county-boundaries",
      paint: {
        "line-color": "#088",
        "line-width": 1,
      },
    });

    applyCountyChoropleth();
  };

  // registered once; layers may not exist yet, which is fine for delegated events
  const registerMapEventHandlers = () => {
    const currentMap = map.current!;

    currentMap.on("click", "states-fill", (e) => {
      const name = e.features?.[0]?.properties?.name;
      if (!name) return;
      setSelectedState(name);
      setSelectedNational(false);
      setSelectedInternational(false);
    });

    currentMap.on("mousemove", "states-fill", (e) => {
      if (byCountyRef.current) return;
      const name = e.features?.[0]?.properties?.name;
      if (!name) return;
      currentMap.getCanvas().style.cursor = "pointer";
      hoverPopup
        .current!.setLngLat(e.lngLat)
        .setHTML(tooltipHtml(name, stateCountsRef.current[name] ?? 0))
        .addTo(currentMap);
    });

    currentMap.on("mouseleave", "states-fill", () => {
      if (byCountyRef.current) return;
      currentMap.getCanvas().style.cursor = "";
      hoverPopup.current!.remove();
    });

    currentMap.on("click", "county-boundaries-fill", (e) => {
      setSelectedCounty(e.features![0].properties.NAME);
      setSelectedNational(false);
      setSelectedInternational(false);
    });

    currentMap.on("mousemove", "county-boundaries-fill", (e) => {
      const name = e.features?.[0]?.properties?.NAME;
      if (!name) return;
      currentMap.getCanvas().style.cursor = "pointer";
      hoverPopup
        .current!.setLngLat(e.lngLat)
        .setHTML(tooltipHtml(name, countyCountsRef.current[name] ?? 0))
        .addTo(currentMap);
    });

    currentMap.on("mouseleave", "county-boundaries-fill", () => {
      currentMap.getCanvas().style.cursor = "";
      hoverPopup.current!.remove();
    });
  };

  useEffect(() => {
    if (map.current) return;

    setLoading(true);
    const setupMap = async () => {
      map.current = new maptilersdk.Map({
        container: mapContainer.current as string | HTMLElement,
        style: maptilersdk.MapStyle.STREETS,
        center: [-98, 39],
        zoom: 4,
      });

      map.current.setMaxBounds([
        [-130, 24],
        [-60, 50],
      ]);

      hoverPopup.current = new maptilersdk.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 8,
      });

      await map.current.onLoadAsync();

      registerMapEventHandlers();

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          function (position) {
            const { latitude, longitude } = position.coords;

            // skip if outside the map's CONUS bounds
            if (
              longitude < -130 ||
              longitude > -60 ||
              latitude < 24 ||
              latitude > 50
            )
              return;

            // mark the user's location but keep the zoomed-out US view
            const marker = new maptilersdk.Marker()
              .setLngLat([longitude, latitude])
              .addTo(map.current!);
            marker.setPopup(
              new maptilersdk.Popup()
                .setLngLat([longitude, latitude])
                .setHTML("You are here!")
            );
          },
          function (error) {
            console.error("cannot get user location: ", error.message);
          }
        );
      } else {
        console.error("geolocation not supported by client browser");
      }

      // for caching geojson data to prevent reload every time
      let data = stateGeoJsonData;
      if (!stateGeoJsonData) {
        try {
          const response = await axios.get(STATE_GEOJSON_URL);
          setStateGeoJsonData(response.data);
          data = response.data;
        } catch (e) {
          console.error("error fetching geojson data: ", e);
          return;
        }
      }
      addStateGeoJsonDataToMap(data);
      setLoading(false);
    };
    setupMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map.current]);

  const removeSourceAndLayers = () => {
    if (map.current!.getLayer("county-boundaries-fill"))
      map.current!.removeLayer("county-boundaries-fill");
    if (map.current!.getLayer("county-boundaries-line"))
      map.current!.removeLayer("county-boundaries-line");
    if (map.current!.getSource("county-boundaries"))
      map.current!.removeSource("county-boundaries");
  };

  useEffect(() => {
    if (loading || !map.current?.getLayer("states-selected")) return;
    const outlinedState =
      selectedNational || selectedInternational ? "" : selectedState;
    map.current.setFilter("states-selected", [
      "==",
      ["get", "name"],
      outlinedState,
    ]);
  }, [selectedState, selectedNational, selectedInternational, loading]);

  useEffect(() => {
    if (!byCounty) {
      if (map.current) {
        removeSourceAndLayers();
        applyStateChoropleth();
      }
      return;
    }
    applyStateChoropleth();

    const addCountyBorders = async () => {
      // similar to caching for state data
      let data = countyGeoJsonData;
      if (!countyGeoJsonData) {
        try {
          const response = await axios.get(COUNTY_GEOJSON_URL);
          setCountyGeoJsonData(response.data);
          data = response.data;
        } catch (e) {
          console.error("error fetching geojson data: ", e);
        }
      }
      addCountyGeoJsonDataToMap(data);
    };

    addCountyBorders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byCounty]);

  const selectedCountyQuery = selectedCounty ? `county=${selectedCounty}` : "";
  const selectedStateQuery = selectedState ? `state=${selectedState}` : "";
  const queryString = selectedCountyQuery
    ? `?${selectedCountyQuery}`
    : selectedStateQuery
      ? `?${selectedStateQuery}`
      : "";

  const fetchOptions: RequestInit = {
    next: { tags: ["groups", queryString], revalidate: 60 * 5 },
    // cache: "force-cache",
  };
  const {
    data: groups,
    error,
    isLoading: isLoadingGroups,
  } = useSWR<GroupData[], any>([`/groups${queryString}`, fetchOptions]);

  useEffect(() => {
    /*
    if NO STATE SELECTED (havent chosen before)
    or NO COUNTY SELECTED and SEARCHING BY COUNTY (first time checking byCounty)
    or COUNTY SELECTED and NOT SEARCHING BY COUNTY (previously selected county, but just unchecked byCounty)
    */
    if (
      !selectedState ||
      (!selectedCounty && byCounty) ||
      (selectedCounty && !byCounty)
    ) {
      setSelectedCounty("");
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedState, selectedCounty]);

  const nationalCount = groupCounts?.states?.["National"] ?? 0;
  const internationalCount = groupCounts?.states?.["International"] ?? 0;

  const GroupsBySelectedLocation = () => {
    if (loading || !selectedState) return;
    if (isLoadingGroups) return <MapLoading />;
    if (error)
      return (
        <p className="text-sm font-normal text-gray-700 mt-4">
          Uh oh! Error 12: loading troops
        </p>
      );
    if (!groups || groups.length === 0)
      return (
        <p className="text-sm font-normal text-gray-700 mt-4">
          No troops found in {selectedCounty && `${selectedCounty}, `}
          {selectedState}.
        </p>
      );

    function getGroupsText() {
      if (selectedNational) {
        return "National Troops";
      }
      if (selectedInternational) {
        return "International Troops";
      }
      return `Troops in ${selectedCounty && `${selectedCounty}, `}${selectedState}`;
    }

    return (
      <Flex className="flex-col gap-4 pt-4">
        <p className="text-base font-semibold">{getGroupsText()}</p>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => {
            return <GroupCard key={group.id} {...group} />;
          })}
        </div>
      </Flex>
    );
  };

  return (
    <Flex className="flex-col gap-2">
      <Flex className="items-end justify-between">
        <IconText icon={FaMapMarkedAlt} textClassName="text-heading5">
          Search troops by location
        </IconText>
        <Checkbox
          isChecked={byCounty}
          onChange={(e) => setByCounty(e.target.checked)}
          disabled={loading}
        >
          <p className="text-sm text-gray-700">Search by county</p>
        </Checkbox>
      </Flex>
      <Flex className={`flex-col gap-2`}>
        <Box className="relative w-full h-[60vh] min-h-[500px]">
          <Card ref={mapContainer} className="absolute w-full h-full">
            {loading && (
              <Flex className="h-full justify-center items-center">
                <Spinner />
              </Flex>
            )}
          </Card>
          {!loading && (
            <div className="absolute top-2 left-2 z-10 bg-white/90 rounded-md shadow-md px-3 py-2 pointer-events-none">
              <p className="text-xs font-semibold text-gray-800 mb-1">
                Troops per {byCounty ? "county" : "state"}
              </p>
              {(byCounty ? LEGEND_ITEMS.slice(1) : LEGEND_ITEMS).map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className="inline-block w-3.5 h-3.5 rounded-sm"
                    style={{
                      backgroundColor: item.color,
                      opacity: item.opacity,
                    }}
                  />
                  <span className="text-xs text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </Box>
        <div className="flex flex-row gap-2 justify-between align-middle items-center">
          <p className="text-sm font-normal text-gray-500 text-center">
            Shaded areas have troops — hover to see counts, click to view them.
          </p>
          <div className="flex flex-row gap-2">
            <Toggle
              variant="outline"
              className="bg-white data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              pressed={selectedNational}
              onPressedChange={() => {
                setSelectedNational(true);
                setSelectedInternational(false);
                setSelectedState("National");
                setSelectedCounty("");
              }}
            >
              National{nationalCount > 0 && ` · ${nationalCount}`}
            </Toggle>
            <Toggle
              variant="outline"
              className="bg-white data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              pressed={selectedInternational}
              onPressedChange={() => {
                setSelectedNational(false);
                setSelectedInternational(true);
                setSelectedState("International");
                setSelectedCounty("");
              }}
            >
              International (OCONUS)
              {internationalCount > 0 && ` · ${internationalCount}`}
            </Toggle>
          </div>
        </div>
        <GroupsBySelectedLocation />
      </Flex>
    </Flex>
  );
};

export default function Map() {
  return (
    <SWRProvider>
      <_Map />
    </SWRProvider>
  );
}
