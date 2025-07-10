import Link from 'next/link';
import { Bot, MessageSquare, UserCog, Users } from 'lucide-react';

const features = [
	{
		name: 'AI Chatbot',
		href: '/chat',
		description: 'Chat with our AI assistant',
		icon: Bot,
		color: 'bg-blue-500',
	},
	{
		name: 'Communities',
		href: '/communities',
		description: 'Receive broadcast messages',
		icon: Users,
		color: 'bg-green-500',
	},
	{
		name: 'Discussions',
		href: '/discussions',
		description: 'Join real-time group chats',
		icon: MessageSquare,
		color: 'bg-purple-500',
	},
	{
		name: 'Admin Panel',
		href: '/admin',
		description: 'Manage community broadcasts',
		icon: UserCog,
		color: 'bg-red-500',
	},
];

export default function HomePage() {
	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
						Welcome to the Platform
					</h1>
					<p className="mt-3 max-w-md mx-auto text-base text-gray-500 dark:text-gray-400 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
						Built with Next.js and RabbitMQ
					</p>
				</div>

				<div className="mt-12">
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
						{features.map((feature) => (
							<Link key={feature.name} href={feature.href} passHref>
								<div className="pt-6 cursor-pointer">
									<div className="flow-root bg-white dark:bg-gray-800 rounded-lg px-6 pb-8 shadow-lg hover:shadow-xl transition-all duration-300 h-full border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-gray-700">
										<div className="-mt-6">
											<div>
												<span
													className={`inline-flex items-center justify-center p-3 ${feature.color} rounded-md shadow-lg`}
												>
													<feature.icon
														className="h-6 w-6 text-white"
														aria-hidden="true"
													/>
												</span>
											</div>
											<h3 className="mt-8 text-lg font-medium text-gray-900 dark:text-white tracking-tight">
												{feature.name}
											</h3>
											<p className="mt-5 text-base text-gray-500 dark:text-gray-400">
												{feature.description}
											</p>
										</div>
									</div>
								</div>
							</Link>
						))}
					</div>
				</div>
			</main>
		</div>
	);
}
