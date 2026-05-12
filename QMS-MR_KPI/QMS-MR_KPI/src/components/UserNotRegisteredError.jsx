export default function UserNotRegisteredError() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">User not registered</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your account does not have access to this application yet. Contact an administrator to be added.
        </p>
      </div>
    </div>
  );
}
