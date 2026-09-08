import Link from "next/link";

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-primary text-white px-6 py-10">
      <div />
      <div>
        <h1 className="text-3xl font-bold mb-3">CampusConnect</h1>
        <p className="text-white/80 mb-8 max-w-sm">
          Ask for help, offer your skills, and get things done with students at your own college.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Link href="/signup" className="btn-accent text-center">
          Create an account
        </Link>
        <Link
          href="/login"
          className="text-center rounded-lg px-4 py-3 font-medium border border-white/30 text-white hover:bg-white/10 transition-colors min-h-[44px]"
        >
          I already have an account
        </Link>
      </div>
    </div>
  );
}
