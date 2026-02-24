import { Link } from 'react-router-dom'

function TelegramIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Brand & description */}
          <div>
            <Link to="/" className="inline-block mb-3">
              <span className="text-2xl font-bold">
                <span className="text-slate-800">Учи</span>
                <span className="text-[#8C52FF]">Он</span>
              </span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed">
              Сервис для учителей по созданию рабочих листов и презентаций с помощью ИИ
            </p>
          </div>

          {/* For teachers */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Для учителей</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-sm text-slate-500 hover:text-[#8C52FF] transition-colors">
                  Генератор рабочих листов
                </Link>
              </li>
              <li>
                <Link to="/presentations/generate" className="text-sm text-slate-500 hover:text-[#8C52FF] transition-colors">
                  Генератор презентаций
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-sm text-slate-500 hover:text-[#8C52FF] transition-colors">
                  Личный кабинет
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-sm text-slate-500 hover:text-[#8C52FF] transition-colors">
                  Тарифы
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Сообщество</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://t.me/ychion_ru"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-[#8C52FF] transition-colors"
                >
                  <TelegramIcon className="w-4 h-4" />
                  Telegram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* ИП info */}
        <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-400 space-y-1">
          <p>ИП Холодова Екатерина Ильинична</p>
          <p>ИНН 774397723210 &middot; ОГРИП 323774600670908</p>
        </div>

        {/* Bottom bar */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              &copy; {currentYear} УчиОн &mdash; сервис для учителей
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <Link to="/legal/user-agreement" className="text-xs text-slate-400 hover:text-[#8C52FF] transition-colors">
                Пользовательское соглашение
              </Link>
              <span className="text-slate-300">|</span>
              <Link to="/legal/privacy-policy" className="text-xs text-slate-400 hover:text-[#8C52FF] transition-colors">
                Политика конфиденциальности
              </Link>
              <span className="text-slate-300">|</span>
              <Link to="/legal/data-consent" className="text-xs text-slate-400 hover:text-[#8C52FF] transition-colors">
                Согласие на обработку данных
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
