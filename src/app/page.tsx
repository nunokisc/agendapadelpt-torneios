import CreateTournamentForm from "@/components/tournament/CreateTournamentForm";
import MyTournaments from "@/components/tournament/MyTournaments";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Torneios de Padel
        </h1>
        <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
          Cria o teu torneio, adiciona as duplas e gere os brackets — tudo num só lugar.
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        <MyTournaments />
        <CreateTournamentForm />
      </div>
    </div>
  );
}
