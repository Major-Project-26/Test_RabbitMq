import React from "react";
import Link from 'next/link';
import { MessageSquare, Users, UserCog, LucideProps } from 'lucide-react';
import { cn } from "@/lib/utils";

interface FeatureLinkProps {
  href: string;
  Icon: React.ComponentType<LucideProps>;
  iconClassName: string;
  title: string;
  description: string;
}

const FeatureLink: React.FC<FeatureLinkProps> = ({ href, Icon, iconClassName, title, description }) => (
  <Link
    href={href}
    className="group rounded-lg border border-transparent px-5 py-6 transition-all duration-300 hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30 flex flex-col items-center text-center"
  >
    <Icon className={cn("w-12 h-12 mb-4", iconClassName)} />
    <h2 className="mb-3 text-2xl font-semibold">{title}</h2>
    <p className="m-0 max-w-[30ch] text-sm opacity-60">{description}</p>
  </Link>
);

const featureLinks: FeatureLinkProps[] = [
  {
    href: "/chat",
    Icon: MessageSquare,
    iconClassName: "text-blue-500",
    title: "Chatbot",
    description: "Start a one-on-one conversation with our AI assistant.",
  },
  {
    href: "/communities",
    Icon: Users,
    iconClassName: "text-green-500",
    title: "Communities",
    description: "View real-time broadcast messages from administrators.",
  },
  {
    href: "/admin",
    Icon: UserCog,
    iconClassName: "text-purple-500",
    title: "Admin",
    description: "Send broadcast messages to all community members.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100">
          MentorStack
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Implementation of Chatbot and Communities
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
        {featureLinks.map((link) => (
          <FeatureLink key={link.href} {...link} />
        ))}
      </div>
    </div>
  );
}
