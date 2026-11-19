import { Mail } from "lucide-react";
import { defineField, defineType } from "sanity";

export const subscriber = defineType({
  name: "subscriber",
  type: "document",
  title: "Subscriber",
  icon: Mail,
  fields: [
    defineField({
      name: "email",
      type: "string",
      title: "Email address",
      description: "The email address of the newsletter subscriber",
      validation: (Rule) => Rule.required().email(),
      readOnly: true, // Prevents accidental edits in Studio
    }),
    defineField({
      name: "subscribedAt",
      type: "datetime",
      title: "Subscribed at",
      description: "Timestamp when the subscriber signed up",
      initialValue: () => new Date().toISOString(),
      readOnly: true,
    }),
    defineField({
      name: "status",
      type: "string",
      title: "Status",
      description: "Subscription status",
      options: {
        list: [
          { title: "Active", value: "active" },
          { title: "Unsubscribed", value: "unsubscribed" },
        ],
        layout: "radio",
      },
      initialValue: "active",
    }),
  ],
  preview: {
    select: {
      title: "email",
      subtitle: "subscribedAt",
      status: "status",
    },
    prepare({ title, subtitle, status }) {
      const date = subtitle
        ? new Date(subtitle).toLocaleDateString()
        : "Unknown date";
      const statusBadge =
        status === "unsubscribed" ? "[Unsubscribed]" : "[Active]";
      return {
        title: title || "No email",
        subtitle: `${statusBadge} • ${date}`,
      };
    },
  },
});
