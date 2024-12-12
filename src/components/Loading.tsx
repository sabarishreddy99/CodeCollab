export function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}