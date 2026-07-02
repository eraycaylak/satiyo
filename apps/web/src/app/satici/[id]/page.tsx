export const runtime = "edge";
import { SellerProfile } from "@/components/SellerProfile";

export default async function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SellerProfile id={id} />;
}
