"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export default function ContactsPanel({ userId }: { userId: Id<"users"> }) {
  const [handleCode, setHandleCode] = useState("");
  const [error, setError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const contacts = useQuery(api.contacts.getContacts, { ownerId: userId });
  const addContact = useMutation(api.contacts.addContact);
  const removeContact = useMutation(api.contacts.removeContact);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = handleCode.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setError("Handle must be exactly 6 alphanumeric characters.");
      return;
    }

    setIsAdding(true);
    try {
      await addContact({ ownerId: userId, handle: code });
      setHandleCode("");
    } catch (err: any) {
      setError(err.message || "Failed to add contact.");
    } finally {
      setIsAdding(false);
    }
  };

  if (!contacts) {
    return <div className="p-4 bg-gray-50 rounded-lg animate-pulse h-32"></div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Contacts</h2>

        <form onSubmit={handleAdd} className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <input
              type="text"
              placeholder="Enter 6-char code"
              value={handleCode}
              onChange={(e) => setHandleCode(e.target.value.toUpperCase())}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
              maxLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={isAdding || handleCode.length === 0}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {isAdding ? "Adding..." : "Add"}
          </button>
        </form>
      </div>

      {error && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm border-b border-red-100">
          {error}
        </div>
      )}

      <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No contacts yet. Add someone's 6-character code above to connect!
          </div>
        ) : (
          contacts.map((contact) => (
            <div key={contact._id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
              <div>
                <div className="font-medium text-gray-900">{contact.user!.name}</div>
                <div className="text-xs text-gray-500 font-mono mt-0.5">{contact.user!.handle}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  contact.status === 'connected'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {contact.status === 'connected' ? 'Connected ✓' : 'Pending ⏳'}
                </span>
                <button
                  onClick={() => removeContact({ contactId: contact._id })}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                  title="Remove contact"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
