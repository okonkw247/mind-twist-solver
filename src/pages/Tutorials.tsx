import { useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle } from 'lucide-react';

const lessons = [
  {
    title: 'Cube notation',
    desc: 'R, U, F, L, D, B and what a prime (\u2032) means.',
  },
  { title: 'Solve the white cross', desc: 'Place the four white edges around the white center.' },
  { title: 'First layer corners', desc: 'Insert white corners with the R U R\u2032 U\u2032 trigger.' },
  { title: 'Middle layer edges', desc: 'Learn the left and right insertion algorithms.' },
  { title: 'Yellow cross', desc: 'Orient the last-layer edges with F R U R\u2032 U\u2032 F\u2032.' },
  { title: 'Last layer corners', desc: 'Permute and orient corners to finish the solve.' },
];

const Tutorials = () => {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ fontFamily: "'Space Grotesk', Inter, system-ui, sans-serif" }}
    >
      <header className="px-5 pt-7 pb-4 flex items-center gap-3 max-w-md w-full mx-auto">
        <button
          onClick={() => navigate('/home')}
          className="w-11 h-11 rounded-2xl bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight">Tutorials</h1>
          <p className="text-[12px] text-muted-foreground">Beginner method, step by step</p>
        </div>
      </header>

      <main className="flex-1 px-5 pb-10 max-w-md w-full mx-auto flex flex-col gap-3">
        {lessons.map((lesson, i) => (
          <button
            key={lesson.title}
            onClick={() => navigate('/virtual-cube')}
            className="rounded-3xl bg-secondary/60 border border-border p-4 flex items-center gap-4 text-left hover:bg-secondary transition-colors active:scale-[0.98]"
          >
            <span className="w-10 h-10 rounded-2xl bg-card border border-border text-primary font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </span>
            <div className="flex-1">
              <span className="block text-[15px] font-bold leading-tight">{lesson.title}</span>
              <p className="text-[12px] text-muted-foreground mt-0.5">{lesson.desc}</p>
            </div>
            <PlayCircle className="w-5 h-5 text-muted-foreground shrink-0" />
          </button>
        ))}
      </main>
    </div>
  );
};

export default Tutorials;
