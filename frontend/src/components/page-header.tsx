export function PageHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-bold tracking-tight text-[#172b3d]">{title}</h1><p className="mt-1 text-sm text-slate-600">{description}</p></div>{action}</header>;
}
