export default function UsersPanel({ users, currentUserId }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
        <span>👥</span>
        <span>Listeners</span>
        <span className="ml-auto text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
          {users.length}
        </span>
      </h3>

      <div className="space-y-1.5">
        {users.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-2">No one here yet…</p>
        ) : (
          users.map((user, i) => {
            const isYou = user.id === currentUserId;
            const initials = user.name?.[0]?.toUpperCase() ?? '?';
            const hue = [...user.name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;

            return (
              <div
                key={user.id ?? i}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg ${
                  isYou ? 'bg-violet-500/10 border border-violet-500/20' : 'bg-white/3'
                }`}
              >
                {/* Avatar */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: `hsl(${hue}, 60%, 45%)` }}
                >
                  {initials}
                </div>

                <span className="text-sm text-gray-300 truncate flex-1">{user.name}</span>

                {isYou && (
                  <span className="text-xs text-violet-400 flex-shrink-0">You</span>
                )}

                {/* Online dot */}
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}