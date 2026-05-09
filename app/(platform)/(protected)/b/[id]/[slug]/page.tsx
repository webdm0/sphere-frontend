import SingleBoardView from "@/components/boards/SingleBoardView";

interface BoardPageProps {
  params: Promise<{ id: string; slug: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params;

  return <SingleBoardView boardId={id} />;
}
