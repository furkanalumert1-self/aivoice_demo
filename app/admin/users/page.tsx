import { Users } from "lucide-react";

const users = [
  { name: "Admin Kullanıcı", email: "admin@klinik.ai", role: "Yönetici", lastLogin: "Bugün 09:15" },
  { name: "Resepsiyon 1", email: "resepsiyon1@klinik.ai", role: "Editör", lastLogin: "Bugün 08:30" },
  { name: "Resepsiyon 2", email: "resepsiyon2@klinik.ai", role: "Görüntüleyici", lastLogin: "Dün 17:45" },
];

const roleColors: Record<string, string> = {
  "Yönetici": "bg-indigo-50 text-indigo-700",
  "Editör": "bg-blue-50 text-blue-700",
  "Görüntüleyici": "bg-gray-100 text-gray-700",
};

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-gray-500 mt-1">Panel kullanıcıları ve yetkileri</p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-3 text-left font-medium text-gray-500">Kullanıcı</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">E-posta</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Rol</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Son Giriş</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.email} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                      <Users className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <span className="font-medium text-gray-900">{user.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[user.role] ?? "bg-gray-100 text-gray-700"}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{user.lastLogin}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                    Aktif
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
