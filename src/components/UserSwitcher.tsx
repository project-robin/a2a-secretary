"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export type User = {
  _id: string;
  name: string;
  agentUrl: string;
};

export function UserSwitcher({ onUserChange }: { onUserChange: (user: User) => void }) {
  const users = useQuery(api.calendar.getUsers);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const initialCallMade = useRef(false);

  useEffect(() => {
    const firstUser = users?.[0];
    if (firstUser && !selectedUserId && !initialCallMade.current) {
      initialCallMade.current = true;
      // Wrap in a promise or timeout to defer the state update and avoid cascading render warnings
      Promise.resolve().then(() => {
        setSelectedUserId(firstUser._id);
        onUserChange(firstUser);
      });
    }
  }, [users, selectedUserId, onUserChange]);

  if (!users) return <div>Loading users...</div>;

  return (
    <div className="flex gap-4 p-4 bg-gray-100 rounded-lg mb-4">
      <span className="font-bold self-center">Switch User:</span>
      {users.map((user: User) => (
        <button
          key={user._id}
          onClick={() => {
            setSelectedUserId(user._id);
            onUserChange(user);
          }}
          className={`px-4 py-2 rounded ${
            selectedUserId === user._id
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          {user.name}
        </button>
      ))}
    </div>
  );
}
