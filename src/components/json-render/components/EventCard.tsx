"use client";

import React from "react";

interface EventCardProps {
  title: string;
  startTime: number;
  endTime: number;
  location?: string;
  description?: string;
}

export const EventCard: React.FC<EventCardProps> = ({
  title,
  startTime,
  endTime,
  location,
  description,
}) => {
  const startStr = new Date(startTime).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endStr = new Date(endTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight">{title}</h3>
          <p className="text-sm text-blue-600 font-medium mt-1">
            {startStr} – {endStr}
          </p>
        </div>
        <div className="bg-blue-50 text-blue-700 p-2 rounded-full">
          <CalendarIcon className="w-5 h-5" />
        </div>
      </div>

      {location && (
        <div className="flex items-center mt-3 text-sm text-gray-500">
          <LocationIcon className="w-4 h-4 mr-1.5" />
          {location}
        </div>
      )}

      {description && (
        <p className="mt-3 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
          {description}
        </p>
      )}
    </div>
  );
};

const CalendarIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
    />
  </svg>
);

const LocationIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
    />
  </svg>
);
