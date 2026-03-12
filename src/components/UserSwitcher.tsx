"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (users && users.length > 0 && !selectedUserId) {
      setSelectedUserId(users[0]._id);
      onUserChange(users[0]);
    }
  }, [users, selectedUserId, onUserChange]);

  if (!users) return <div>Loading users...</div>;

  return (
    <div className="flex gap-4 p-4 bg-gray-100 rounded-lg mb-4">
      <span className="font-bold self-center">Switch User:</span>
      {users.map((user) => (
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
