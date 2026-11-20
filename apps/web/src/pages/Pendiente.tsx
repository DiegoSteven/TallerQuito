/** Marcador para las pantallas que se construyen según el cronograma. */
export function Pendiente({ titulo }: { titulo: string }) {
  return (
    <>
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <div className="mt-4 rounded-xl border-2 border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
        🚧 Pantalla en construcción. El diseño de referencia está en <code>docs/prototipo_fase1.html</code>.
      </div>
    </>
  );
}
