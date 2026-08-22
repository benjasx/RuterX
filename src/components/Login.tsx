import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Mail, Lock, Loader2, AlertCircle } from "lucide-react";
// ⚠️ Nota: En el siguiente paso ajustaremos esta ruta de importación de Firebase
import { auth } from "../firebase/config";

interface LoginProps {
  mensajeInicial?: string;
}

export default function Login({ mensajeInicial }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Login no se desmonta si el intento de sesión termina rechazado (cuenta
  // deshabilitada): la sesión nunca llega a establecerse en RuterMapas. Por eso
  // el mensaje que llega por prop se combina con el error local en vez de copiarlo
  // a un estado aparte.
  const mensajeMostrado = error || mensajeInicial || "";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Si el login es exitoso, el "Guardián" que haremos en el siguiente paso detectará el cambio automáticamente
    } catch (err: any) {
      console.error(err);
      setError("Correo o contraseña incorrectos. Verifica tus datos.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg p-8 border border-slate-200 dark:border-slate-800">
        {/* Logo / Encabezado */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl overflow-hidden mx-auto mb-4 shadow-md">
            <img
              src="https://avatars.githubusercontent.com/u/62582879?v=4&size=64"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            RuterX Logistics
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Ingresa a tu cuenta para continuar
          </p>
        </div>

        {/* Mensaje de Error */}
        {mensajeMostrado && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{mensajeMostrado}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Correo Electrónico
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="chofer@ruterx.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                <Lock size={18} />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition-colors shadow-md mt-4"
          >
            {cargando ? (
              <>
                <Loader2 size={20} className="animate-spin" /> Verificando...
              </>
            ) : (
              "Iniciar Sesión"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
