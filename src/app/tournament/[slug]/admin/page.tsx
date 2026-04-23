import { redirect } from "next/navigation";

// Admin is handled via ?token= on the main tournament page
export default async function AdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/tournament/${slug}`);
}
