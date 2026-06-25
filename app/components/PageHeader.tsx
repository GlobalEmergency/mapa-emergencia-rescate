interface PageHeaderProps {
  title: string;
  description: string;
  icon?: string;
}

export default function PageHeader({
  title,
  description,
  icon,
}: PageHeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:py-10">
        {icon && (
          <span className="text-3xl" aria-hidden>
            {icon}
          </span>
        )}
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          {description}
        </p>
      </div>
    </header>
  );
}
