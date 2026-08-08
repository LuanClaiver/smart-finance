(()=>{
const __mods={"src/App.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Shell_1 = __importDefault(require("src/components/Shell.tsx"));
const api_1 = require("src/services/api.ts");
const navigation_1 = require("src/services/navigation.ts");
const toast_1 = require("src/services/toast.ts");
const theme_1 = require("src/services/theme.ts");
const AuthPage_1 = __importDefault(require("src/pages/AuthPage.tsx"));
const DashboardPage_1 = __importDefault(require("src/pages/DashboardPage.tsx"));
const IncomesPage_1 = __importDefault(require("src/pages/IncomesPage.tsx"));
const ExpensesPage_1 = __importDefault(require("src/pages/ExpensesPage.tsx"));
const AccountsPage_1 = __importDefault(require("src/pages/AccountsPage.tsx"));
const CardsPage_1 = __importDefault(require("src/pages/CardsPage.tsx"));
const LoansPage_1 = __importDefault(require("src/pages/LoansPage.tsx"));
const ReportsPage_1 = __importDefault(require("src/pages/ReportsPage.tsx"));
const PlanningPage_1 = __importDefault(require("src/pages/PlanningPage.tsx"));
const ImportPage_1 = __importDefault(require("src/pages/ImportPage.tsx"));
const AdminPage_1 = __importDefault(require("src/pages/AdminPage.tsx"));
const SettingsPage_1 = __importDefault(require("src/pages/SettingsPage.tsx"));
function App() {
    const initialRoute = (0, navigation_1.readNavigationTarget)();
    const [user, setUser] = (0, react_1.useState)(null);
    const [ownerUsers, setOwnerUsers] = (0, react_1.useState)([]);
    const [ownerId, setOwnerId] = (0, react_1.useState)(0);
    const [page, setPage] = (0, react_1.useState)(initialRoute.page);
    const [loading, setLoading] = (0, react_1.useState)(true);
    const [ownerVersion, setOwnerVersion] = (0, react_1.useState)(0);
    const [routeVersion, setRouteVersion] = (0, react_1.useState)(0);
    const [theme, setTheme] = (0, react_1.useState)(theme_1.getInitialTheme);
    async function configureUser(current) {
        // Define primeiro qual banco de usuário a API deve consultar. Assim, a página
        // nunca faz uma primeira leitura com o proprietário anterior salvo no navegador.
        if (current.role === 'admin') {
            const users = await (0, api_1.api)('/admin/users');
            const stored = Number(localStorage.getItem('smart-finance-owner-id'));
            const selected = users.some((item) => item.id === stored) ? stored : current.id;
            (0, api_1.setSelectedOwnerId)(selected);
            setOwnerUsers(users);
            setOwnerId(selected);
        }
        else {
            (0, api_1.setSelectedOwnerId)(null);
            setOwnerUsers([current]);
            setOwnerId(current.id);
        }
        setUser(current);
    }
    (0, react_1.useEffect)(() => {
        (0, theme_1.applyTheme)(theme);
    }, [theme]);
    (0, react_1.useEffect)(() => {
        const syncRoute = () => {
            const route = (0, navigation_1.readNavigationTarget)();
            setPage(route.page);
            setRouteVersion((value) => value + 1);
        };
        if (!window.location.hash)
            (0, navigation_1.navigateTo)('dashboard');
        window.addEventListener('hashchange', syncRoute);
        return () => window.removeEventListener('hashchange', syncRoute);
    }, []);
    (0, react_1.useEffect)(() => {
        (0, api_1.api)('/auth/me').then(configureUser).catch(() => setUser(null)).finally(() => setLoading(false));
    }, []);
    function changeOwner(id) {
        setOwnerId(id);
        (0, api_1.setSelectedOwnerId)(id);
        setOwnerVersion((value) => value + 1);
    }
    function navigate(pageName) {
        (0, navigation_1.navigateTo)(pageName);
        setPage(pageName);
    }
    function logout() {
        (0, api_1.setToken)(null);
        (0, api_1.setSelectedOwnerId)(null);
        setUser(null);
        setOwnerUsers([]);
        setOwnerId(0);
        (0, navigation_1.navigateTo)('dashboard');
        setPage('dashboard');
        toast_1.toast.info('Sessão encerrada', 'Você saiu do Smart Finance.');
    }
    if (loading)
        return (0, jsx_runtime_1.jsxs)("div", { className: "splash", children: [(0, jsx_runtime_1.jsx)("div", { className: "hero-logo", children: (0, jsx_runtime_1.jsx)("img", { src: "/icon.svg", alt: "" }) }), (0, jsx_runtime_1.jsx)("strong", { children: "Smart Finance" })] });
    if (!user)
        return (0, jsx_runtime_1.jsx)(AuthPage_1.default, { onAuthenticated: configureUser, theme: theme, onToggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark') });
    const pageKey = `${page}-${ownerVersion}-${routeVersion}`;
    const content = page === 'dashboard' ? (0, jsx_runtime_1.jsx)(DashboardPage_1.default, {}, pageKey)
        : page === 'incomes' ? (0, jsx_runtime_1.jsx)(IncomesPage_1.default, {}, pageKey)
            : page === 'expenses' ? (0, jsx_runtime_1.jsx)(ExpensesPage_1.default, {}, pageKey)
                : page === 'accounts' ? (0, jsx_runtime_1.jsx)(AccountsPage_1.default, {}, pageKey)
                    : page === 'cards' ? (0, jsx_runtime_1.jsx)(CardsPage_1.default, {}, pageKey)
                        : page === 'loans' ? (0, jsx_runtime_1.jsx)(LoansPage_1.default, {}, pageKey)
                            : page === 'planning' ? (0, jsx_runtime_1.jsx)(PlanningPage_1.default, {}, pageKey)
                                : page === 'import' ? (0, jsx_runtime_1.jsx)(ImportPage_1.default, {}, pageKey)
                                    : page === 'reports' ? (0, jsx_runtime_1.jsx)(ReportsPage_1.default, {}, pageKey)
                                        : page === 'admin' && user.role === 'admin' ? (0, jsx_runtime_1.jsx)(AdminPage_1.default, { currentUser: user }, pageKey)
                                            : (0, jsx_runtime_1.jsx)(SettingsPage_1.default, { user: user, onUser: configureUser }, pageKey);
    return (0, jsx_runtime_1.jsx)(Shell_1.default, { user: user, active: page, ownerUsers: ownerUsers, ownerId: ownerId, theme: theme, onToggleTheme: () => setTheme((current) => current === 'dark' ? 'light' : 'dark'), onOwnerChange: changeOwner, onNavigate: navigate, onLogout: logout, children: content });
}

},
"src/components/AlertCenter.tsx":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AlertCenter;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const api_1 = require("src/services/api.ts");
const navigation_1 = require("src/services/navigation.ts");
function AlertCenter() {
    const [items, setItems] = (0, react_1.useState)([]);
    const [open, setOpen] = (0, react_1.useState)(false);
    const rootRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const onPointerDown = (event) => {
            if (!rootRef.current?.contains(event.target))
                setOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                setOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);
    (0, react_1.useEffect)(() => {
        (0, api_1.api)('/alerts').then((data) => {
            setItems(data);
            if ('Notification' in window && Notification.permission === 'granted') {
                const notified = new Set(JSON.parse(sessionStorage.getItem('smart-finance-notified') || '[]'));
                data.filter((item) => item.level !== 'info').slice(0, 3).forEach((item) => {
                    const key = `${item.type}:${item.target_id}:${item.date}`;
                    if (!notified.has(key)) {
                        try {
                            const notification = new Notification(item.title, { body: `${item.message} • ${(0, api_1.money)(item.amount)}`, icon: '/icon.svg' });
                            notification.onclick = () => {
                                window.focus();
                                (0, navigation_1.navigateTo)(item.target_page, item.target_id, item.month);
                                notification.close();
                            };
                        }
                        catch { /* navegador sem contexto seguro */ }
                        notified.add(key);
                    }
                });
                sessionStorage.setItem('smart-finance-notified', JSON.stringify([...notified]));
            }
        }).catch(() => undefined);
    }, []);
    async function enableNotifications() {
        if ('Notification' in window)
            await Notification.requestPermission();
    }
    function openItem(item) {
        setOpen(false);
        (0, navigation_1.navigateTo)(item.target_page, item.target_id, item.month);
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "alert-center", ref: rootRef, children: [(0, jsx_runtime_1.jsxs)("button", { className: "notification-button", onClick: () => setOpen(!open), "aria-label": "Abrir notifica\u00E7\u00F5es", children: ["\uD83D\uDD14", items.length > 0 && (0, jsx_runtime_1.jsx)("b", { children: items.length })] }), open && (0, jsx_runtime_1.jsx)("button", { type: "button", className: "alert-mobile-backdrop", "aria-label": "Fechar alertas", onClick: () => setOpen(false) }), open && (0, jsx_runtime_1.jsxs)("div", { className: "alert-popover", role: "dialog", "aria-modal": "true", "aria-label": "Central de alertas", children: [(0, jsx_runtime_1.jsxs)("div", { className: "popover-title", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Alertas" }), (0, jsx_runtime_1.jsxs)("div", { className: "popover-title-actions", children: [(0, jsx_runtime_1.jsx)("button", { onClick: enableNotifications, children: "Ativar avisos" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "popover-close", "aria-label": "Fechar alertas", onClick: () => setOpen(false), children: "\u00D7" })] })] }), items.length === 0 ? (0, jsx_runtime_1.jsx)("p", { className: "empty", children: "Nenhum alerta no momento." }) : items.map((item) => ((0, jsx_runtime_1.jsxs)("button", { type: "button", className: `alert-row ${item.level}`, onClick: () => openItem(item), children: [(0, jsx_runtime_1.jsx)("strong", { children: item.title }), (0, jsx_runtime_1.jsx)("span", { children: item.message }), (0, jsx_runtime_1.jsxs)("small", { children: [(0, api_1.money)(item.amount), " \u2022 ", item.date] }), (0, jsx_runtime_1.jsx)("em", { children: "Abrir lan\u00E7amento \u2192" })] }, `${item.type}-${item.target_id}`)))] })] }));
}

},
"src/components/ConfirmHost.tsx":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ConfirmHost;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const confirm_1 = require("src/services/confirm.ts");
function ConfirmHost() {
    const [request, setRequest] = (0, react_1.useState)(null);
    const confirmButton = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => (0, confirm_1.subscribeToConfirmations)((next) => {
        setRequest((current) => {
            if (current)
                current.resolve(false);
            return next;
        });
    }), []);
    (0, react_1.useEffect)(() => {
        if (!request)
            return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.requestAnimationFrame(() => confirmButton.current?.focus());
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                finish(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [request]);
    function finish(value) {
        setRequest((current) => {
            current?.resolve(value);
            return null;
        });
    }
    if (!request)
        return null;
    return (0, jsx_runtime_1.jsx)("div", { className: "confirm-backdrop", role: "presentation", onMouseDown: (event) => {
            if (event.target === event.currentTarget)
                finish(false);
        }, children: (0, jsx_runtime_1.jsxs)("section", { className: `confirm-card ${request.tone}`, role: "alertdialog", "aria-modal": "true", "aria-labelledby": "confirm-title", "aria-describedby": "confirm-message", children: [(0, jsx_runtime_1.jsx)("div", { className: "confirm-symbol", "aria-hidden": "true", children: request.tone === 'danger' ? '!' : request.tone === 'warning' ? '⚠' : '?' }), (0, jsx_runtime_1.jsxs)("div", { className: "confirm-copy", children: [(0, jsx_runtime_1.jsx)("span", { className: "confirm-eyebrow", children: "Confirma\u00E7\u00E3o necess\u00E1ria" }), (0, jsx_runtime_1.jsx)("h2", { id: "confirm-title", children: request.title }), (0, jsx_runtime_1.jsx)("p", { id: "confirm-message", children: request.message }), request.detail && (0, jsx_runtime_1.jsx)("small", { children: request.detail })] }), (0, jsx_runtime_1.jsxs)("div", { className: "confirm-actions", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "secondary-button", onClick: () => finish(false), children: request.cancelLabel }), (0, jsx_runtime_1.jsx)("button", { ref: confirmButton, type: "button", className: request.tone === 'danger' ? 'danger-button' : 'primary-button', onClick: () => finish(true), children: request.confirmLabel })] })] }) });
}

},
"src/components/EmptyState.tsx":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EmptyState;
const jsx_runtime_1 = require("react/jsx-runtime");
function EmptyState({ text }) {
    return (0, jsx_runtime_1.jsxs)("div", { className: "empty-state", children: [(0, jsx_runtime_1.jsx)("span", { children: "\u25C7" }), (0, jsx_runtime_1.jsx)("p", { children: text })] });
}

},
"src/components/GlobalSearch.tsx":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = GlobalSearch;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const api_1 = require("src/services/api.ts");
const navigation_1 = require("src/services/navigation.ts");
function GlobalSearch({ onNavigate }) {
    const [query, setQuery] = (0, react_1.useState)('');
    const [results, setResults] = (0, react_1.useState)([]);
    const [open, setOpen] = (0, react_1.useState)(false);
    const host = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(() => {
        if (query.trim().length < 2) {
            setResults([]);
            return;
        }
        const timer = window.setTimeout(() => (0, api_1.api)(`/search?q=${encodeURIComponent(query.trim())}`).then(setResults).catch(() => setResults([])), 250);
        return () => window.clearTimeout(timer);
    }, [query]);
    (0, react_1.useEffect)(() => {
        const close = (event) => {
            if (!host.current?.contains(event.target))
                setOpen(false);
        };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, []);
    function choose(item) {
        setOpen(false);
        setQuery('');
        setResults([]);
        (0, navigation_1.navigateTo)(item.page, item.id, item.month);
        onNavigate?.(item.page);
    }
    return (0, jsx_runtime_1.jsxs)("div", { className: "global-search", ref: host, children: [(0, jsx_runtime_1.jsx)("span", { className: "global-search-icon", "aria-hidden": "true", children: "⌕" }), (0, jsx_runtime_1.jsx)("input", { value: query, onFocus: () => setOpen(true), onChange: e => {
                    setQuery(e.target.value);
                    setOpen(true);
                }, placeholder: "Buscar lançamentos...", "aria-label": "Buscar no Smart Finance" }), open && query.trim().length >= 2 && (0, jsx_runtime_1.jsx)("div", { className: "global-search-results", children: results.length
                ? results.map((item, index) => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => choose(item), children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: item.title }), (0, jsx_runtime_1.jsx)("small", { children: item.subtitle })] }), typeof item.amount === 'number' && (0, jsx_runtime_1.jsx)("b", { children: (0, api_1.money)(item.amount) })] }, `${item.kind}-${item.id}-${index}`)))
                : (0, jsx_runtime_1.jsx)("div", { className: "global-search-empty", children: "Nenhum resultado." }) })] });
}

},
"src/components/ModalCard.tsx":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ModalCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function ModalCard({ children, onClose, label, wide = false }) {
    (0, react_1.useEffect)(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (event) => {
            if (event.key === 'Escape' && !document.querySelector('.confirm-backdrop')) {
                event.preventDefault();
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose]);
    return (0, jsx_runtime_1.jsx)("div", { className: "modal-backdrop", role: "presentation", onMouseDown: (event) => {
            if (event.target === event.currentTarget)
                onClose();
        }, children: (0, jsx_runtime_1.jsxs)("div", { className: `modal-shell ${wide ? 'wide' : ''}`, role: "dialog", "aria-modal": "true", "aria-label": label, children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "modal-close", onClick: onClose, "aria-label": "Fechar", children: "\u00D7" }), children] }) });
}

},
"src/components/MoneyInput.tsx":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMoneyInput = parseMoneyInput;
exports.formatMoneyInput = formatMoneyInput;
exports.default = MoneyInput;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
function normalizeTypedValue(value, allowNegative) {
    let cleaned = value.replace(/[^0-9,.-]/g, '');
    if (!allowNegative)
        cleaned = cleaned.replace(/-/g, '');
    else
        cleaned = `${cleaned.startsWith('-') ? '-' : ''}${cleaned.replace(/-/g, '')}`;
    return cleaned;
}
function parseMoneyInput(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : 0;
    let text = String(value ?? '').trim().replace(/\s+/g, '').replace(/R\$/gi, '');
    if (!text)
        return 0;
    const negative = text.startsWith('-');
    text = text.replace(/-/g, '').replace(/[^0-9,.]/g, '');
    if (!text)
        return 0;
    let normalized = text;
    if (text.includes(',')) {
        const lastComma = text.lastIndexOf(',');
        const integerPart = text.slice(0, lastComma).replace(/[.,]/g, '') || '0';
        const decimalPart = text.slice(lastComma + 1).replace(/[^0-9]/g, '').slice(0, 2);
        normalized = decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
    }
    else if (text.includes('.')) {
        const dots = (text.match(/\./g) || []).length;
        const lastDot = text.lastIndexOf('.');
        const decimals = text.length - lastDot - 1;
        if (dots === 1 && decimals > 0 && decimals <= 2) {
            normalized = text;
        }
        else {
            normalized = text.replace(/\./g, '');
        }
    }
    const result = Number(normalized);
    if (!Number.isFinite(result))
        return 0;
    return negative ? -result : result;
}
function formatMoneyInput(value) {
    const number = parseMoneyInput(value);
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(number);
}
function MoneyInput({ name, defaultValue = '', allowNegative = false, onBlur, onFocus, ...props }) {
    const hasDefault = defaultValue !== '' && defaultValue !== null && defaultValue !== undefined;
    const [display, setDisplay] = (0, react_1.useState)(hasDefault ? formatMoneyInput(defaultValue) : '');
    const normalizedValue = display.trim() ? String(parseMoneyInput(display)) : '';
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("input", { ...props, type: "text", inputMode: "decimal", value: display, placeholder: props.placeholder || '0,00', onChange: (event) => setDisplay(normalizeTypedValue(event.target.value, allowNegative)), onFocus: (event) => {
                    event.currentTarget.select();
                    onFocus?.(event);
                }, onBlur: (event) => {
                    if (display.trim())
                        setDisplay(formatMoneyInput(display));
                    onBlur?.(event);
                } }), (0, jsx_runtime_1.jsx)("input", { type: "hidden", name: name, value: normalizedValue })] });
}

},
"src/components/PageHeader.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PageHeader;
const jsx_runtime_1 = require("react/jsx-runtime");
const AlertCenter_1 = __importDefault(require("src/components/AlertCenter.tsx"));
function PageHeader({ title, subtitle, actions }) {
    return (0, jsx_runtime_1.jsxs)("header", { className: "page-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { children: title }), subtitle && (0, jsx_runtime_1.jsx)("p", { children: subtitle })] }), (0, jsx_runtime_1.jsxs)("div", { className: "header-actions", children: [actions, (0, jsx_runtime_1.jsx)(AlertCenter_1.default, {})] })] });
}

},
"src/components/Shell.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Shell;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const GlobalSearch_1 = __importDefault(require("src/components/GlobalSearch.tsx"));
const baseItems = [
    ['dashboard', '◫', 'Visão geral'],
    ['incomes', '+', 'Rendas'],
    ['expenses', '−', 'Despesas'],
    ['accounts', '▣', 'Contas'],
    ['cards', '▤', 'Cartões'],
    ['loans', '↗', 'Empréstimos'],
    ['planning', '⌁', 'Planejamento'],
    ['import', '⇩', 'Importar extrato'],
    ['reports', '▧', 'Relatório PDF'],
    ['settings', '⚙', 'Configurações'],
];
function Shell({ user, active, ownerUsers, ownerId, theme, onToggleTheme, onOwnerChange, onNavigate, onLogout, children }) {
    const [moreOpen, setMoreOpen] = (0, react_1.useState)(false);
    const moreRef = (0, react_1.useRef)(null);
    const items = (0, react_1.useMemo)(() => user.role === 'admin'
        ? [...baseItems.slice(0, -1), ['admin', '♟', 'Usuários'], baseItems[baseItems.length - 1]]
        : baseItems, [user.role]);
    const activeLabel = items.find(([id]) => id === active)?.[2] || 'Smart Finance';
    (0, react_1.useEffect)(() => {
        if (!moreOpen)
            return;
        const onPointerDown = (event) => {
            if (!moreRef.current?.contains(event.target))
                setMoreOpen(false);
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape')
                setMoreOpen(false);
        };
        document.addEventListener('mousedown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [moreOpen]);
    const navigate = (page) => {
        setMoreOpen(false);
        onNavigate(page);
    };
    return (0, jsx_runtime_1.jsxs)("div", { className: "app-shell", children: [(0, jsx_runtime_1.jsxs)("aside", { className: "sidebar", children: [(0, jsx_runtime_1.jsxs)("div", { className: "sidebar-brand-row", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "brand brand-button", onClick: () => navigate('dashboard'), "aria-label": "Voltar para a visão geral", children: [(0, jsx_runtime_1.jsx)("span", { className: "brand-mark", children: (0, jsx_runtime_1.jsx)("img", { src: "/icon.svg", alt: "" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Smart Finance" }), (0, jsx_runtime_1.jsx)("small", { children: "Controle financeiro local" })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "theme-toggle sidebar-theme-toggle", onClick: onToggleTheme, "aria-label": theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro', title: theme === 'dark' ? 'Tema claro' : 'Tema escuro', children: theme === 'dark' ? '☀️' : '🌙' })] }), (0, jsx_runtime_1.jsx)("div", { className: "sidebar-search", children: (0, jsx_runtime_1.jsx)(GlobalSearch_1.default, { onNavigate: navigate }) }), user.role === 'admin' && (0, jsx_runtime_1.jsxs)("label", { className: "owner-selector", children: ["Dados exibidos", (0, jsx_runtime_1.jsx)("select", { value: ownerId, onChange: (event) => onOwnerChange(Number(event.target.value)), children: ownerUsers.map((item) => ((0, jsx_runtime_1.jsx)("option", { value: item.id, children: item.display_name }, item.id))) })] }), (0, jsx_runtime_1.jsx)("nav", { children: items.map(([id, icon, label]) => ((0, jsx_runtime_1.jsxs)("button", { className: active === id ? 'nav-item active' : 'nav-item', onClick: () => navigate(id), children: [(0, jsx_runtime_1.jsx)("span", { children: icon }), label] }, id))) }), (0, jsx_runtime_1.jsxs)("div", { className: "sidebar-user", children: [(0, jsx_runtime_1.jsx)("div", { className: "avatar", children: user.display_name.slice(0, 1).toUpperCase() }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: user.display_name }), (0, jsx_runtime_1.jsx)("small", { children: user.role === 'admin' ? 'Administrador' : user.username })] }), (0, jsx_runtime_1.jsx)("button", { className: "icon-button", title: "Sair", onClick: onLogout, children: "↪" })] })] }), (0, jsx_runtime_1.jsxs)("header", { className: "mobile-topbar", children: [(0, jsx_runtime_1.jsxs)("button", { type: "button", className: "mobile-topbar-brand mobile-brand-button", onClick: () => navigate('dashboard'), "aria-label": "Voltar para a visão geral", children: [(0, jsx_runtime_1.jsx)("img", { src: "/icon.svg", alt: "" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Smart Finance" }), (0, jsx_runtime_1.jsx)("small", { children: activeLabel })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "theme-toggle", onClick: onToggleTheme, "aria-label": theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro', children: theme === 'dark' ? '☀️' : '🌙' })] }), (0, jsx_runtime_1.jsxs)("main", { className: "main-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "mobile-global-search", children: (0, jsx_runtime_1.jsx)(GlobalSearch_1.default, { onNavigate: navigate }) }), user.role === 'admin' && (0, jsx_runtime_1.jsxs)("div", { className: "mobile-owner-bar", children: [(0, jsx_runtime_1.jsx)("span", { children: "Visualizando:" }), (0, jsx_runtime_1.jsx)("select", { value: ownerId, onChange: (event) => onOwnerChange(Number(event.target.value)), children: ownerUsers.map((item) => ((0, jsx_runtime_1.jsx)("option", { value: item.id, children: item.display_name }, item.id))) })] }), children] }), (0, jsx_runtime_1.jsxs)("nav", { className: "mobile-nav", children: [items.slice(0, 5).map(([id, icon, label]) => ((0, jsx_runtime_1.jsxs)("button", { className: active === id ? 'active' : '', onClick: () => navigate(id), children: [(0, jsx_runtime_1.jsx)("span", { children: icon }), (0, jsx_runtime_1.jsx)("small", { children: label })] }, id))), (0, jsx_runtime_1.jsxs)("button", { className: moreOpen ? 'active' : '', onClick: () => setMoreOpen(!moreOpen), children: [(0, jsx_runtime_1.jsx)("span", { children: "•••" }), (0, jsx_runtime_1.jsx)("small", { children: "Mais" })] })] }), moreOpen && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "mobile-menu-backdrop", onClick: () => setMoreOpen(false), "aria-label": "Fechar menu" }), (0, jsx_runtime_1.jsxs)("div", { className: "mobile-more-menu", ref: moreRef, children: [(0, jsx_runtime_1.jsx)("div", { className: "mobile-more-handle" }), (0, jsx_runtime_1.jsxs)("div", { className: "mobile-more-user", children: [(0, jsx_runtime_1.jsx)("div", { className: "avatar", children: user.display_name.slice(0, 1).toUpperCase() }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: user.display_name }), (0, jsx_runtime_1.jsx)("small", { children: user.role === 'admin' ? 'Administrador' : `@${user.username}` })] })] }), items.slice(5).map(([id, icon, label]) => ((0, jsx_runtime_1.jsxs)("button", { className: active === id ? 'active' : '', onClick: () => navigate(id), children: [(0, jsx_runtime_1.jsx)("span", { children: icon }), label] }, id))), (0, jsx_runtime_1.jsxs)("button", { onClick: onToggleTheme, children: [(0, jsx_runtime_1.jsx)("span", { children: theme === 'dark' ? '☀' : '🌙' }), theme === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'] }), (0, jsx_runtime_1.jsxs)("button", { className: "mobile-logout", onClick: onLogout, children: [(0, jsx_runtime_1.jsx)("span", { children: "↪" }), "Sair"] })] })] })] });
}

},
"src/components/ToastHost.tsx":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ToastHost;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const toast_1 = require("src/services/toast.ts");
const icons = {
    success: '✓',
    error: '!',
    info: 'i',
    warning: '⚠',
};
function ToastHost() {
    const [items, setItems] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => (0, toast_1.subscribeToToasts)((payload) => {
        const item = { ...payload, id: payload.id || `${Date.now()}-${Math.random()}` };
        setItems((current) => [...current.slice(-3), item]);
        window.setTimeout(() => {
            setItems((current) => current.filter((toast) => toast.id !== item.id));
        }, item.duration || 3800);
    }), []);
    function dismiss(id) {
        setItems((current) => current.filter((item) => item.id !== id));
    }
    return (0, jsx_runtime_1.jsx)("div", { className: "toast-host", "aria-live": "polite", "aria-atomic": "false", children: items.map((item) => (0, jsx_runtime_1.jsxs)("div", { className: `smart-toast ${item.kind}`, role: item.kind === 'error' ? 'alert' : 'status', children: [(0, jsx_runtime_1.jsx)("span", { className: "toast-icon", children: icons[item.kind] }), (0, jsx_runtime_1.jsxs)("div", { className: "toast-copy", children: [(0, jsx_runtime_1.jsx)("strong", { children: item.title }), item.message && (0, jsx_runtime_1.jsx)("small", { children: item.message })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", "aria-label": "Fechar aviso", onClick: () => dismiss(item.id), children: "\u00D7" })] }, item.id)) });
}

},
"src/main.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const client_1 = __importDefault(require("react-dom/client"));
const App_1 = __importDefault(require("src/App.tsx"));
const ToastHost_1 = __importDefault(require("src/components/ToastHost.tsx"));
const ConfirmHost_1 = __importDefault(require("src/components/ConfirmHost.tsx"));
require("__css__");
client_1.default.createRoot(document.getElementById('root')).render((0, jsx_runtime_1.jsxs)(react_1.default.StrictMode, { children: [(0, jsx_runtime_1.jsx)(App_1.default, {}), (0, jsx_runtime_1.jsx)(ToastHost_1.default, {}), (0, jsx_runtime_1.jsx)(ConfirmHost_1.default, {})] }));

},
"src/pages/AccountsPage.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AccountsPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const EmptyState_1 = __importDefault(require("src/components/EmptyState.tsx"));
const ModalCard_1 = __importDefault(require("src/components/ModalCard.tsx"));
const PageHeader_1 = __importDefault(require("src/components/PageHeader.tsx"));
const MoneyInput_1 = __importDefault(require("src/components/MoneyInput.tsx"));
const api_1 = require("src/services/api.ts");
const confirm_1 = require("src/services/confirm.ts");
const toast_1 = require("src/services/toast.ts");
const accountTypeLabels = { digital: 'Conta digital', checking: 'Conta corrente', savings: 'Poupança', wallet: 'Carteira', cash: 'Dinheiro' };
function AccountsPage() {
    const [items, setItems] = (0, react_1.useState)([]);
    const [transfers, setTransfers] = (0, react_1.useState)([]);
    const [month, setMonth] = (0, react_1.useState)((0, api_1.currentMonth)());
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [showTransfer, setShowTransfer] = (0, react_1.useState)(false);
    const [reconciling, setReconciling] = (0, react_1.useState)(null);
    const [editing, setEditing] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)('');
    const load = () => Promise.all([(0, api_1.api)('/accounts/summary'), (0, api_1.api)(`/transfers?month=${month}`)])
        .then(([accounts, transferRows]) => { setItems(accounts); setTransfers(transferRows); setError(''); })
        .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar contas'));
    (0, react_1.useEffect)(() => { void load(); }, [month]);
    function openNew() { setEditing(null); setError(''); setShowForm(true); }
    function openEdit(item) { setEditing(item); setError(''); setShowForm(true); }
    function closeForm() { setShowForm(false); setEditing(null); }
    async function submit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const payload = { name: String(form.get('name') || '').trim(), account_type: String(form.get('account_type') || 'digital'), initial_balance: Number(form.get('initial_balance') || 0), reported_balance: editing?.reported_balance ?? null, is_active: true };
        try {
            if (editing)
                await (0, api_1.api)(`/accounts/${editing.id}`, { method: 'PATCH', ...(0, api_1.jsonBody)(payload) });
            else
                await (0, api_1.api)('/accounts', { method: 'POST', ...(0, api_1.jsonBody)(payload) });
            const wasEditing = Boolean(editing);
            closeForm();
            await load();
            toast_1.toast.success(wasEditing ? 'Conta atualizada' : 'Conta salva', payload.name);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao salvar';
            setError(message);
            toast_1.toast.error('Não foi possível salvar a conta', message);
        }
    }
    async function reconcile(event) {
        event.preventDefault();
        if (!reconciling)
            return;
        const form = new FormData(event.currentTarget);
        try {
            await (0, api_1.api)(`/accounts/${reconciling.id}/reconcile`, { method: 'POST', ...(0, api_1.jsonBody)({ reported_balance: Number(form.get('reported_balance') || 0) }) });
            setReconciling(null);
            await load();
            toast_1.toast.success('Saldo conferido', 'O Smart Finance comparou o saldo do banco com o saldo calculado.');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao conciliar';
            setError(message);
            toast_1.toast.error('Não foi possível conciliar', message);
        }
    }
    async function createTransfer(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
            await (0, api_1.api)('/transfers', { method: 'POST', ...(0, api_1.jsonBody)({ from_account_id: Number(form.get('from_account_id')), to_account_id: Number(form.get('to_account_id')), amount: Number(form.get('amount')), transfer_date: form.get('transfer_date'), notes: form.get('notes') || '' }) });
            setShowTransfer(false);
            await load();
            toast_1.toast.success('Transferência registrada', 'A movimentação entre contas não entra como renda nem despesa.');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao transferir';
            setError(message);
            toast_1.toast.error('Não foi possível registrar a transferência', message);
        }
    }
    async function removeTransfer(id) { const ok = await (0, confirm_1.confirmAction)({ title: 'Excluir transferência?', message: 'A movimentação entre contas será removida.', confirmLabel: 'Excluir', tone: 'danger' }); if (!ok)
        return; await (0, api_1.api)(`/transfers/${id}`, { method: 'DELETE' }); await load(); toast_1.toast.success('Transferência excluída', 'Os saldos calculados foram atualizados.'); }
    async function remove(id) { const account = items.find((item) => item.id === id); const confirmed = await (0, confirm_1.confirmAction)({ title: `Excluir ${account?.name || 'esta conta'}?`, message: 'Esta conta será removida do Smart Finance.', detail: 'Lançamentos vinculados não serão apagados, mas ficarão sem a conta selecionada.', confirmLabel: 'Excluir conta', tone: 'danger' }); if (!confirmed)
        return; try {
        await (0, api_1.api)(`/accounts/${id}`, { method: 'DELETE' });
        await load();
        toast_1.toast.success('Conta excluída', 'A conta foi removida.');
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao excluir';
        setError(message);
        toast_1.toast.error('Não foi possível excluir a conta', message);
    } }
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageHeader_1.default, { title: "Contas e carteiras", subtitle: "Saldo calculado, concilia\u00E7\u00E3o e transfer\u00EAncias entre suas contas", actions: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { className: "secondary-button compact", onClick: () => setShowTransfer(true), children: "\u21C4 Transferir" }), (0, jsx_runtime_1.jsx)("button", { className: "primary-button compact", onClick: openNew, children: "+ Nova conta" })] }) }), showForm && (0, jsx_runtime_1.jsx)(ModalCard_1.default, { onClose: closeForm, label: editing ? `Editar conta ${editing.name}` : 'Nova conta', children: (0, jsx_runtime_1.jsxs)("form", { className: "panel form-grid modal-form", onSubmit: submit, children: [(0, jsx_runtime_1.jsx)("h3", { className: "form-title wide", children: editing ? `Editar conta: ${editing.name}` : 'Nova conta' }), (0, jsx_runtime_1.jsxs)("label", { children: ["Nome", (0, jsx_runtime_1.jsx)("input", { name: "name", required: true, defaultValue: editing?.name || '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Tipo", (0, jsx_runtime_1.jsxs)("select", { name: "account_type", defaultValue: editing?.account_type || 'digital', children: [(0, jsx_runtime_1.jsx)("option", { value: "digital", children: "Conta digital" }), (0, jsx_runtime_1.jsx)("option", { value: "checking", children: "Conta corrente" }), (0, jsx_runtime_1.jsx)("option", { value: "savings", children: "Poupan\u00E7a" }), (0, jsx_runtime_1.jsx)("option", { value: "wallet", children: "Carteira" }), (0, jsx_runtime_1.jsx)("option", { value: "cash", children: "Dinheiro" })] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Saldo inicial", (0, jsx_runtime_1.jsx)(MoneyInput_1.default, { name: "initial_balance", allowNegative: true, defaultValue: editing ? Number(editing.initial_balance) : 0 })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "primary-button", children: editing ? 'Salvar alterações' : 'Salvar' }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "secondary-button", onClick: closeForm, children: "Cancelar" })] })] }) }), showTransfer && (0, jsx_runtime_1.jsx)(ModalCard_1.default, { onClose: () => setShowTransfer(false), label: "Transferir entre contas", children: (0, jsx_runtime_1.jsxs)("form", { className: "panel form-grid modal-form", onSubmit: createTransfer, children: [(0, jsx_runtime_1.jsx)("h3", { className: "form-title wide", children: "Transfer\u00EAncia interna" }), (0, jsx_runtime_1.jsxs)("label", { children: ["Origem", (0, jsx_runtime_1.jsxs)("select", { name: "from_account_id", required: true, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione" }), items.map(x => (0, jsx_runtime_1.jsx)("option", { value: x.id, children: x.name }, x.id))] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Destino", (0, jsx_runtime_1.jsxs)("select", { name: "to_account_id", required: true, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione" }), items.map(x => (0, jsx_runtime_1.jsx)("option", { value: x.id, children: x.name }, x.id))] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Valor", (0, jsx_runtime_1.jsx)(MoneyInput_1.default, { name: "amount", required: true })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Data", (0, jsx_runtime_1.jsx)("input", { name: "transfer_date", type: "date", defaultValue: (0, api_1.today)(), required: true })] }), (0, jsx_runtime_1.jsxs)("label", { className: "wide", children: ["Observa\u00E7\u00F5es", (0, jsx_runtime_1.jsx)("textarea", { name: "notes", rows: 2 })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "primary-button", children: "Registrar transfer\u00EAncia" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "secondary-button", onClick: () => setShowTransfer(false), children: "Cancelar" })] })] }) }), reconciling && (0, jsx_runtime_1.jsx)(ModalCard_1.default, { onClose: () => setReconciling(null), label: `Conciliar ${reconciling.name}`, children: (0, jsx_runtime_1.jsxs)("form", { className: "panel form-grid modal-form", onSubmit: reconcile, children: [(0, jsx_runtime_1.jsx)("h3", { className: "form-title wide", children: "Conferir saldo" }), (0, jsx_runtime_1.jsxs)("div", { className: "wide reconciliation-summary", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Calculado pelo Smart Finance ", (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(reconciling.calculated_balance) })] }), reconciling.reported_balance != null && (0, jsx_runtime_1.jsxs)("span", { children: ["\u00DAltimo informado ", (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(Number(reconciling.reported_balance)) })] })] }), (0, jsx_runtime_1.jsxs)("label", { className: "wide", children: ["Saldo que aparece no banco agora", (0, jsx_runtime_1.jsx)(MoneyInput_1.default, { name: "reported_balance", allowNegative: true, required: true, defaultValue: reconciling.reported_balance ?? reconciling.calculated_balance })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "primary-button", children: "Comparar saldo" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "secondary-button", onClick: () => setReconciling(null), children: "Cancelar" })] })] }) }), error && (0, jsx_runtime_1.jsx)("div", { className: "form-error", children: error }), (0, jsx_runtime_1.jsx)("section", { className: "cards-list account-summary-list", children: items.length === 0 ? (0, jsx_runtime_1.jsx)(EmptyState_1.default, { text: "Nenhuma conta cadastrada." }) : items.map(item => (0, jsx_runtime_1.jsxs)("article", { className: "list-card account-list-card", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: item.name }), (0, jsx_runtime_1.jsx)("span", { children: accountTypeLabels[item.account_type] || item.account_type })] }), (0, jsx_runtime_1.jsxs)("div", { className: "account-balance-stack", children: [(0, jsx_runtime_1.jsx)("small", { children: "Saldo calculado" }), (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(Number(item.calculated_balance)) }), item.reported_balance != null && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("small", { children: ["Saldo informado: ", (0, api_1.money)(Number(item.reported_balance))] }), (0, jsx_runtime_1.jsx)("span", { className: Math.abs(Number(item.difference || 0)) < 0.01 ? 'reconcile-ok' : 'reconcile-warning', children: Math.abs(Number(item.difference || 0)) < 0.01 ? '✓ Conciliado' : `Diferença: ${(0, api_1.money)(Number(item.difference || 0))}` })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "account-card-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "secondary-button compact", onClick: () => setReconciling(item), children: "Conciliar" }), (0, jsx_runtime_1.jsx)("button", { className: "secondary-button compact", onClick: () => openEdit(item), children: "Editar" }), (0, jsx_runtime_1.jsx)("button", { className: "danger-button", onClick: () => remove(item.id), children: "Excluir" })] })] }, item.id)) }), (0, jsx_runtime_1.jsxs)("section", { className: "panel transfers-history", children: [(0, jsx_runtime_1.jsxs)("div", { className: "panel-title-row", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: "Transfer\u00EAncias internas" }), (0, jsx_runtime_1.jsx)("p", { children: "N\u00E3o alteram seus totais de renda e despesa." })] }), (0, jsx_runtime_1.jsx)("input", { type: "month", className: "month-input", value: month, onChange: e => setMonth(e.target.value) })] }), transfers.length ? (0, jsx_runtime_1.jsx)("div", { className: "simple-list", children: transfers.map(t => (0, jsx_runtime_1.jsxs)("div", { className: "simple-list-row", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("strong", { children: [items.find(x => x.id === t.from_account_id)?.name || 'Conta', " \u2192 ", items.find(x => x.id === t.to_account_id)?.name || 'Conta'] }), (0, jsx_runtime_1.jsxs)("small", { children: [t.transfer_date, t.notes ? ` • ${t.notes}` : ''] })] }), (0, jsx_runtime_1.jsx)("span", { children: (0, api_1.money)(Number(t.amount)) }), (0, jsx_runtime_1.jsx)("button", { className: "danger-text", onClick: () => removeTransfer(t.id), children: "Excluir" })] }, t.id)) }) : (0, jsx_runtime_1.jsx)(EmptyState_1.default, { text: "Nenhuma transfer\u00EAncia neste m\u00EAs." })] })] });
}

},
"src/pages/AdminPage.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AdminPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const PageHeader_1 = __importDefault(require("src/components/PageHeader.tsx"));
const api_1 = require("src/services/api.ts");
const confirm_1 = require("src/services/confirm.ts");
const toast_1 = require("src/services/toast.ts");
function AdminPage({ currentUser }) {
    const [users, setUsers] = (0, react_1.useState)([]);
    const [error, setError] = (0, react_1.useState)('');
    const load = () => (0, api_1.api)('/admin/users').then(setUsers).catch((err) => setError(err.message));
    (0, react_1.useEffect)(() => { void load(); }, []);
    async function patch(user, changes, successMessage = 'Usuário atualizado') {
        try {
            await (0, api_1.api)(`/admin/users/${user.id}`, { method: 'PATCH', ...(0, api_1.jsonBody)(changes) });
            await load();
            toast_1.toast.success(successMessage, user.display_name);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao atualizar';
            setError(message);
            toast_1.toast.error('Não foi possível atualizar o usuário', message);
        }
    }
    async function editUser(user) {
        const display_name = prompt('Nome exibido:', user.display_name);
        if (display_name === null)
            return;
        const username = prompt('Nome de usuário:', user.username);
        if (username === null)
            return;
        const email = prompt('E-mail:', user.email);
        if (email === null)
            return;
        await patch(user, { display_name, username, email }, 'Dados do usuário atualizados');
    }
    async function resetPassword(user) {
        const password = prompt(`Nova senha temporária para ${user.display_name}:`);
        if (password)
            await patch(user, { password }, 'Senha redefinida');
    }
    async function remove(user) {
        const confirmed = await (0, confirm_1.confirmAction)({
            title: `Excluir ${user.display_name}?`,
            message: 'A conta e todos os dados financeiros deste usuário serão excluídos.',
            detail: 'Esta ação não pode ser desfeita. Faça um backup antes de continuar.',
            confirmLabel: 'Excluir usuário',
            tone: 'danger',
        });
        if (!confirmed)
            return;
        try {
            await (0, api_1.api)(`/admin/users/${user.id}`, { method: 'DELETE' });
            await load();
            toast_1.toast.success('Usuário excluído', user.display_name);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao excluir';
            setError(message);
            toast_1.toast.error('Não foi possível excluir o usuário', message);
        }
    }
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageHeader_1.default, { title: "Gerenciar usu\u00E1rios", subtitle: "Administra\u00E7\u00E3o local de contas e permiss\u00F5es" }), error && (0, jsx_runtime_1.jsx)("div", { className: "form-error", children: error }), (0, jsx_runtime_1.jsx)("section", { className: "table-panel", children: (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Usu\u00E1rio" }), (0, jsx_runtime_1.jsx)("th", { children: "E-mail" }), (0, jsx_runtime_1.jsx)("th", { children: "Permiss\u00E3o" }), (0, jsx_runtime_1.jsx)("th", { children: "Status" }), (0, jsx_runtime_1.jsx)("th", { children: "A\u00E7\u00F5es" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: users.map((user) => (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("strong", { children: user.display_name }), (0, jsx_runtime_1.jsxs)("small", { className: "block", children: ["@", user.username] })] }), (0, jsx_runtime_1.jsx)("td", { children: user.email }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("select", { value: user.role, disabled: user.id === currentUser.id, onChange: (e) => patch(user, { role: e.target.value }), children: [(0, jsx_runtime_1.jsx)("option", { value: "user", children: "Usu\u00E1rio" }), (0, jsx_runtime_1.jsx)("option", { value: "admin", children: "Administrador" })] }) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("label", { className: "switch-label", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: user.is_active, disabled: user.id === currentUser.id, onChange: (e) => patch(user, { is_active: e.target.checked }) }), " ", user.is_active ? 'Ativo' : 'Inativo'] }) }), (0, jsx_runtime_1.jsxs)("td", { className: "row-actions", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => editUser(user), children: "Editar" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => resetPassword(user), children: "Redefinir senha" }), user.id !== currentUser.id && (0, jsx_runtime_1.jsx)("button", { className: "danger-text", onClick: () => remove(user), children: "Excluir" })] })] }, user.id)) })] }) })] });
}

},
"src/pages/AuthPage.tsx":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AuthPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const api_1 = require("src/services/api.ts");
const toast_1 = require("src/services/toast.ts");
function AuthPage({ onAuthenticated, theme, onToggleTheme }) {
    const [mode, setMode] = (0, react_1.useState)('login');
    const [error, setError] = (0, react_1.useState)('');
    const [loading, setLoading] = (0, react_1.useState)(false);
    async function submit(event) {
        event.preventDefault();
        setError('');
        setLoading(true);
        const form = new FormData(event.currentTarget);
        try {
            if (mode === 'login') {
                const response = await (0, api_1.api)('/auth/login', {
                    method: 'POST',
                    ...(0, api_1.jsonBody)({ identifier: form.get('identifier'), password: form.get('password') }),
                });
                (0, api_1.setToken)(response.token);
                onAuthenticated(response.user);
                toast_1.toast.success('Login realizado', `Bem-vindo, ${response.user.display_name}.`);
            }
            else if (mode === 'register') {
                const response = await (0, api_1.api)('/auth/register', {
                    method: 'POST',
                    ...(0, api_1.jsonBody)({
                        username: form.get('username'),
                        display_name: form.get('display_name'),
                        email: form.get('email'),
                        password: form.get('password'),
                        recovery_key: form.get('recovery_key'),
                    }),
                });
                (0, api_1.setToken)(response.token);
                onAuthenticated(response.user);
                toast_1.toast.success('Conta criada', `Bem-vindo, ${response.user.display_name}.`);
            }
            else {
                await (0, api_1.api)('/auth/recover', {
                    method: 'POST',
                    ...(0, api_1.jsonBody)({
                        identifier: form.get('identifier'),
                        recovery_key: form.get('recovery_key'),
                        new_password: form.get('new_password'),
                    }),
                });
                setMode('login');
                toast_1.toast.success('Senha redefinida', 'Você já pode entrar com a nova senha.');
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Falha na autenticação';
            setError(message);
            toast_1.toast.error('Operação não concluída', message);
        }
        finally {
            setLoading(false);
        }
    }
    const title = mode === 'login' ? 'Entrar no sistema' : mode === 'register' ? 'Criar uma conta' : 'Recuperar senha';
    const subtitle = mode === 'login'
        ? 'Acesse com seu usuário ou e-mail.'
        : mode === 'register'
            ? 'Crie um perfil local e mantenha seus dados separados.'
            : 'Informe sua chave de recuperação para definir uma nova senha.';
    return (0, jsx_runtime_1.jsxs)("div", { className: "auth-screen", children: [(0, jsx_runtime_1.jsx)("div", { className: "auth-glow auth-glow-left" }), (0, jsx_runtime_1.jsx)("div", { className: "auth-glow auth-glow-right" }), (0, jsx_runtime_1.jsxs)("main", { className: `auth-frame auth-mode-${mode}`, children: [(0, jsx_runtime_1.jsxs)("section", { className: "auth-hero", children: [(0, jsx_runtime_1.jsxs)("div", { className: "auth-version-badge", children: [(0, jsx_runtime_1.jsx)("img", { src: "/icon.svg", alt: "" }), (0, jsx_runtime_1.jsxs)("span", { children: ["Smart Finance ", (0, jsx_runtime_1.jsx)("b", { children: "0.5.3" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "auth-hero-copy", children: [(0, jsx_runtime_1.jsx)("span", { className: "auth-eyebrow", children: "Controle financeiro pessoal" }), (0, jsx_runtime_1.jsx)("h1", { children: "Organize hoje. Decida melhor amanh\u00E3." }), (0, jsx_runtime_1.jsx)("p", { children: "Tenha rendas, despesas, contas, cart\u00F5es e empr\u00E9stimos em um s\u00F3 lugar, com dados locais e separados por usu\u00E1rio." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "auth-feature-grid", children: [(0, jsx_runtime_1.jsxs)("article", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "\uD83D\uDD10" }), (0, jsx_runtime_1.jsx)("span", { children: "Dados privados" })] }), (0, jsx_runtime_1.jsxs)("article", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "\uD83D\uDCCA" }), (0, jsx_runtime_1.jsx)("span", { children: "Vis\u00E3o completa" })] }), (0, jsx_runtime_1.jsxs)("article", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "\uD83D\uDCF1" }), (0, jsx_runtime_1.jsx)("span", { children: "PC e celular" })] })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "auth-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "auth-brand-row", children: [(0, jsx_runtime_1.jsxs)("div", { className: "auth-brand-copy", children: [(0, jsx_runtime_1.jsx)("img", { src: "/icon.svg", alt: "Logo Smart Finance" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: "Smart Finance" }), (0, jsx_runtime_1.jsx)("span", { children: "Vers\u00E3o 0.5.3" })] })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "theme-toggle auth-theme-toggle", onClick: onToggleTheme, "aria-label": theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro', title: theme === 'dark' ? 'Tema claro' : 'Tema escuro', children: theme === 'dark' ? '☀️' : '🌙' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "auth-heading", children: [(0, jsx_runtime_1.jsx)("span", { children: "Acesso" }), (0, jsx_runtime_1.jsx)("h2", { children: title }), mode !== 'login' && (0, jsx_runtime_1.jsx)("p", { children: subtitle })] }), (0, jsx_runtime_1.jsxs)("form", { onSubmit: submit, autoComplete: "off", children: [mode === 'register' && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("label", { children: ["Nome de exibi\u00E7\u00E3o", (0, jsx_runtime_1.jsx)("input", { name: "display_name", required: true, maxLength: 80, autoComplete: "name", placeholder: "Ex.: Jo\u00E3o D\u2019\u00C1vila-Silva" }), (0, jsx_runtime_1.jsx)("small", { children: "Aceita espa\u00E7os, acentos, ap\u00F3strofo e h\u00EDfen." })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Nome de usu\u00E1rio", (0, jsx_runtime_1.jsx)("input", { name: "username", minLength: 3, maxLength: 30, required: true, autoComplete: "username", spellCheck: false, placeholder: "Ex.: joao.silva" })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["E-mail", (0, jsx_runtime_1.jsx)("input", { name: "email", type: "email", required: true, autoComplete: "email", placeholder: "seuemail@exemplo.com" })] })] }), mode !== 'register' && (0, jsx_runtime_1.jsxs)("label", { children: ["Usu\u00E1rio ou e-mail", (0, jsx_runtime_1.jsx)("input", { name: "identifier", required: true, autoComplete: "username", placeholder: "Usu\u00E1rio ou e-mail" })] }), mode === 'login' && (0, jsx_runtime_1.jsxs)("label", { children: ["Senha", (0, jsx_runtime_1.jsx)("input", { name: "password", type: "password", required: true, autoComplete: "current-password", placeholder: "Digite sua senha" })] }), mode === 'register' && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("label", { children: ["Senha", (0, jsx_runtime_1.jsx)("input", { name: "password", type: "password", minLength: 4, required: true, autoComplete: "new-password", placeholder: "Crie uma senha" })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Chave de recupera\u00E7\u00E3o", (0, jsx_runtime_1.jsx)("input", { name: "recovery_key", minLength: 6, required: true, autoComplete: "off", placeholder: "Crie uma chave segura" }), (0, jsx_runtime_1.jsx)("small", { children: "Guarde essa chave fora do sistema." })] })] }), mode === 'recover' && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("label", { children: ["Chave de recupera\u00E7\u00E3o", (0, jsx_runtime_1.jsx)("input", { name: "recovery_key", required: true, autoComplete: "off", placeholder: "Digite sua chave" })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Nova senha", (0, jsx_runtime_1.jsx)("input", { name: "new_password", type: "password", minLength: 4, required: true, autoComplete: "new-password", placeholder: "Digite a nova senha" })] })] }), error && (0, jsx_runtime_1.jsx)("div", { className: "form-error", role: "alert", children: error }), (0, jsx_runtime_1.jsx)("button", { className: "primary-button auth-submit", disabled: loading, children: loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Cadastrar' : 'Redefinir senha' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "auth-links", children: [mode !== 'login' && (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => { setError(''); setMode('login'); }, children: "Voltar ao login" }), mode === 'login' && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => { setError(''); setMode('register'); }, children: "Criar uma nova conta" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => { setError(''); setMode('recover'); }, children: "Esqueci minha senha" })] })] })] })] })] });
}

},
"src/pages/CardsPage.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CardsPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const EmptyState_1 = __importDefault(require("src/components/EmptyState.tsx"));
const ModalCard_1 = __importDefault(require("src/components/ModalCard.tsx"));
const PageHeader_1 = __importDefault(require("src/components/PageHeader.tsx"));
const MoneyInput_1 = __importDefault(require("src/components/MoneyInput.tsx"));
const api_1 = require("src/services/api.ts");
const confirm_1 = require("src/services/confirm.ts");
const toast_1 = require("src/services/toast.ts");
function monthLabel(value) {
    const [year, month] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}
function dateLabel(value) {
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
}
function CardsPage() {
    const [items, setItems] = (0, react_1.useState)([]);
    const [accounts, setAccounts] = (0, react_1.useState)([]);
    const [month, setMonth] = (0, react_1.useState)((0, api_1.currentMonth)());
    const [invoice, setInvoice] = (0, react_1.useState)(null);
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [editing, setEditing] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)('');
    const load = () => Promise.all([(0, api_1.api)('/cards'), (0, api_1.api)('/accounts')])
        .then(([cards, accountItems]) => { setItems(cards); setAccounts(accountItems); setError(''); })
        .catch((err) => setError(err.message));
    (0, react_1.useEffect)(() => { void load(); }, []);
    function openNew() {
        setEditing(null);
        setError('');
        setShowForm(true);
    }
    function openEdit(card) {
        setEditing(card);
        setError('');
        setShowForm(true);
    }
    function closeForm() {
        setShowForm(false);
        setEditing(null);
    }
    async function submit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const payload = {
            name: form.get('name'),
            bank: form.get('bank') || '',
            brand: form.get('brand') || '',
            credit_limit: Number(form.get('credit_limit') || 0),
            closing_day: Number(form.get('closing_day')),
            due_day: Number(form.get('due_day')),
            payment_account_id: form.get('payment_account_id') ? Number(form.get('payment_account_id')) : null,
            color: form.get('color') || '#22c55e',
            is_active: true,
        };
        try {
            if (editing) {
                await (0, api_1.api)(`/cards/${editing.id}`, { method: 'PATCH', ...(0, api_1.jsonBody)(payload) });
            }
            else {
                await (0, api_1.api)('/cards', { method: 'POST', ...(0, api_1.jsonBody)(payload) });
            }
            const wasEditing = Boolean(editing);
            closeForm();
            setInvoice(null);
            await load();
            toast_1.toast.success(wasEditing ? 'Cartão atualizado' : 'Cartão salvo', `${String(payload.name)} foi ${wasEditing ? 'atualizado' : 'adicionado'}.`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao salvar';
            setError(message);
            toast_1.toast.error('Não foi possível salvar o cartão', message);
        }
    }
    async function fetchInvoice(id, selectedMonth) {
        return (0, api_1.api)(`/cards/${id}/invoice?month=${encodeURIComponent(selectedMonth)}`);
    }
    async function viewInvoice(id, selectedMonth = month) {
        try {
            setError('');
            const data = await fetchInvoice(id, selectedMonth);
            setInvoice(data);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao abrir fatura';
            setError(message);
            toast_1.toast.error('Não foi possível abrir a fatura', message);
        }
    }
    async function payInvoice() {
        if (!invoice)
            return;
        try {
            await (0, api_1.api)(`/cards/${invoice.card.id}/invoice/pay?month=${invoice.month}${invoice.card.payment_account_id ? `&account_id=${invoice.card.payment_account_id}` : ''}`, { method: 'POST' });
            await viewInvoice(invoice.card.id, invoice.month);
            toast_1.toast.success('Fatura paga', `${invoice.card.name} • ${monthLabel(invoice.month)}`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao pagar fatura';
            setError(message);
            toast_1.toast.error('Pagamento da fatura não concluído', message);
        }
    }
    async function remove(id) {
        const card = items.find((item) => item.id === id);
        const confirmed = await (0, confirm_1.confirmAction)({
            title: `Excluir ${card?.name || 'este cartão'}?`,
            message: 'O cartão será removido do cadastro.',
            detail: 'Compras já registradas continuarão no histórico, mas deixarão de estar vinculadas ao cartão.',
            confirmLabel: 'Excluir cartão',
            tone: 'danger',
        });
        if (!confirmed)
            return;
        try {
            await (0, api_1.api)(`/cards/${id}`, { method: 'DELETE' });
            setInvoice(null);
            await load();
            toast_1.toast.success('Cartão excluído', 'O cartão foi removido.');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao excluir';
            setError(message);
            toast_1.toast.error('Não foi possível excluir o cartão', message);
        }
    }
    function changeMonth(value) {
        setMonth(value);
        if (invoice)
            void viewInvoice(invoice.card.id, value);
    }
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageHeader_1.default, { title: "Cart\u00F5es", subtitle: "Faturas agrupadas pelo m\u00EAs de vencimento", actions: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("input", { className: "month-input", type: "month", value: month, onChange: (event) => changeMonth(event.target.value) }), (0, jsx_runtime_1.jsx)("button", { className: "primary-button compact", onClick: openNew, children: "+ Novo cart\u00E3o" })] }) }), showForm && (0, jsx_runtime_1.jsx)(ModalCard_1.default, { onClose: closeForm, label: editing ? `Editar cartão ${editing.name}` : 'Novo cartão', wide: true, children: (0, jsx_runtime_1.jsxs)("form", { className: "panel form-grid modal-form", onSubmit: submit, children: [(0, jsx_runtime_1.jsx)("h3", { className: "form-title wide", children: editing ? `Editar cartão: ${editing.name}` : 'Novo cartão' }), (0, jsx_runtime_1.jsxs)("label", { children: ["Nome", (0, jsx_runtime_1.jsx)("input", { name: "name", placeholder: "Ex.: Inter", required: true, defaultValue: editing?.name || '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Banco", (0, jsx_runtime_1.jsx)("input", { name: "bank", defaultValue: editing?.bank || '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Bandeira", (0, jsx_runtime_1.jsx)("input", { name: "brand", placeholder: "Visa, Mastercard...", defaultValue: editing?.brand || '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Limite", (0, jsx_runtime_1.jsx)(MoneyInput_1.default, { name: "credit_limit", required: true, defaultValue: editing ? Number(editing.credit_limit) : 0 })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Dia do fechamento", (0, jsx_runtime_1.jsx)("input", { name: "closing_day", type: "number", min: "1", max: "31", defaultValue: editing?.closing_day || 28 })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Dia do vencimento", (0, jsx_runtime_1.jsx)("input", { name: "due_day", type: "number", min: "1", max: "31", defaultValue: editing?.due_day || 7 })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Conta de pagamento", (0, jsx_runtime_1.jsxs)("select", { name: "payment_account_id", defaultValue: editing?.payment_account_id || '', children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "N\u00E3o informada" }), accounts.map((item) => (0, jsx_runtime_1.jsx)("option", { value: item.id, children: item.name }, item.id))] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Cor", (0, jsx_runtime_1.jsx)("input", { name: "color", type: "color", defaultValue: editing?.color || '#22c55e' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "primary-button", children: editing ? 'Salvar alterações' : 'Salvar' }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "secondary-button", onClick: closeForm, children: "Cancelar" })] })] }) }), error && (0, jsx_runtime_1.jsx)("div", { className: "form-error", children: error }), (0, jsx_runtime_1.jsx)("section", { className: "cards-grid", children: items.length === 0 ? (0, jsx_runtime_1.jsx)(EmptyState_1.default, { text: "Nenhum cart\u00E3o cadastrado." }) : items.map((item) => (0, jsx_runtime_1.jsxs)("article", { className: "credit-card", style: { '--card-color': item.color }, children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("small", { children: item.bank || 'Cartão' }), (0, jsx_runtime_1.jsx)("strong", { children: item.name })] }), (0, jsx_runtime_1.jsx)("span", { children: item.brand || 'Crédito' }), (0, jsx_runtime_1.jsxs)("div", { className: "credit-meta", children: [(0, jsx_runtime_1.jsx)("small", { children: "Limite" }), (0, jsx_runtime_1.jsx)("b", { children: (0, api_1.money)(Number(item.credit_limit)) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "credit-cycle", children: [(0, jsx_runtime_1.jsxs)("span", { children: ["Fecha dia ", item.closing_day] }), (0, jsx_runtime_1.jsxs)("span", { children: ["Vence dia ", item.due_day] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "card-actions", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => viewInvoice(item.id), children: "Ver fatura" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => openEdit(item), children: "Editar" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => remove(item.id), children: "Excluir" })] })] }, item.id)) }), invoice && (0, jsx_runtime_1.jsx)(ModalCard_1.default, { onClose: () => setInvoice(null), label: `Fatura ${invoice.card.name}`, wide: true, children: (0, jsx_runtime_1.jsxs)("section", { className: "panel invoice-panel modal-invoice", children: [(0, jsx_runtime_1.jsxs)("div", { className: "invoice-title", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("h3", { children: ["Fatura ", invoice.card.name] }), (0, jsx_runtime_1.jsxs)("p", { children: ["Vencimento em ", monthLabel(invoice.month), " \u2022 ", invoice.items.length, " lan\u00E7amento(s)"] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(invoice.total) }), (0, jsx_runtime_1.jsx)("span", { className: `status ${invoice.status === 'paid' ? 'paid' : 'pending'}`, children: invoice.status === 'paid' ? 'Paga' : 'Aberta' })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "invoice-cycle-note", children: ["Fecha dia ", invoice.card.closing_day, " \u2022 Vence dia ", invoice.card.due_day, ". Esta tela usa o m\u00EAs do vencimento para ficar igual \u00E0 aba Despesas."] }), (0, jsx_runtime_1.jsx)("div", { className: "invoice-items", children: invoice.items.length === 0 ? (0, jsx_runtime_1.jsx)("p", { className: "empty", children: "Nenhuma fatura ou compra deste cart\u00E3o vence neste m\u00EAs." }) : invoice.items.map((item) => (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("span", { className: "invoice-item-copy", children: [(0, jsx_runtime_1.jsxs)("strong", { children: [item.description, item.installment_number ? ` • ${item.installment_number}/${item.total_installments}` : ''] }), (0, jsx_runtime_1.jsxs)("small", { children: ["Vence em ", dateLabel(item.due_date), " \u2022 Compra em ", dateLabel(item.purchase_date)] })] }), (0, jsx_runtime_1.jsx)("b", { children: (0, api_1.money)(Number(item.amount)) })] }, item.id)) }), (0, jsx_runtime_1.jsxs)("div", { className: "invoice-actions", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "secondary-button", onClick: () => setInvoice(null), children: "Fechar" }), invoice.items.length > 0 && invoice.status !== 'paid' && (0, jsx_runtime_1.jsx)("button", { className: "primary-button compact", onClick: payInvoice, children: "Pagar fatura" })] })] }) })] });
}

},
"src/pages/DashboardPage.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DashboardPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const PageHeader_1 = __importDefault(require("src/components/PageHeader.tsx"));
const api_1 = require("src/services/api.ts");
function clampPercent(value, total) { if (total <= 0)
    return 0; return Math.max(0, Math.min(100, (value / total) * 100)); }
function changeLabel(value) { if (value === null || value === undefined)
    return 'Sem comparação'; const sign = value > 0 ? '+' : ''; return `${sign}${value.toFixed(1)}% vs. mês anterior`; }
function ProgressSummary({ title, completedLabel, pendingLabel, completed, total, tone }) { const pending = Math.max(0, total - completed); const percent = clampPercent(completed, total); return (0, jsx_runtime_1.jsxs)("article", { className: `progress-summary ${tone}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "progress-summary-head", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: title }), (0, jsx_runtime_1.jsxs)("strong", { children: [Math.round(percent), "%"] })] }), (0, jsx_runtime_1.jsxs)("small", { children: [(0, api_1.money)(completed), " de ", (0, api_1.money)(total)] })] }), (0, jsx_runtime_1.jsx)("div", { className: "progress-summary-track", children: (0, jsx_runtime_1.jsx)("div", { className: "progress-summary-fill", style: { width: `${percent}%` } }) }), (0, jsx_runtime_1.jsxs)("div", { className: "progress-summary-values", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: completedLabel }), (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(completed) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { children: pendingLabel }), (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(pending) })] })] })] }); }
function CategoryBar({ label, value, total }) { const percent = clampPercent(value, total); return (0, jsx_runtime_1.jsxs)("div", { className: "category-progress-row", children: [(0, jsx_runtime_1.jsxs)("div", { className: "category-progress-head", children: [(0, jsx_runtime_1.jsx)("span", { children: label }), (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(value) })] }), (0, jsx_runtime_1.jsx)("div", { className: "category-progress-track", children: (0, jsx_runtime_1.jsx)("div", { className: "category-progress-fill", style: { width: `${Math.max(percent, value > 0 ? 2 : 0)}%` } }) }), (0, jsx_runtime_1.jsxs)("small", { children: [Math.round(percent), "% das despesas do m\u00EAs"] })] }); }
function DashboardPage() {
    const [month, setMonth] = (0, react_1.useState)((0, api_1.currentMonth)());
    const [data, setData] = (0, react_1.useState)(null);
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [error, setError] = (0, react_1.useState)('');
    (0, react_1.useEffect)(() => {
        setError('');
        Promise.all([(0, api_1.api)(`/dashboard?month=${month}`), (0, api_1.api)('/categories?kind=expense')])
            .then(([summary, list]) => {
            setData(summary);
            setCategories(list);
        })
            .catch(err => {
            setData(null);
            setError(err instanceof Error ? err.message : 'Não foi possível carregar o resumo.');
        });
    }, [month]);
    const categoryRows = (0, react_1.useMemo)(() => {
        const names = new Map(categories.map(item => [item.id, item.name]));
        return (data?.by_category || [])
            .map(item => ({
            name: item.category_name || names.get(item.category_id || -1) || 'Sem categoria',
            total: item.total,
        }))
            .sort((a, b) => b.total - a.total);
    }, [data, categories]);
    const categoryTotal = categoryRows.reduce((sum, item) => sum + item.total, 0);
    const remainingToPay = Math.max(0, Number(data?.expense_expected || 0) - Number(data?.expense_paid || 0));
    const remainingToReceive = Math.max(0, Number(data?.income_expected || 0) - Number(data?.income_received || 0));
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageHeader_1.default, { title: "Visão geral", subtitle: "Resumo e diagnóstico financeiro do mês selecionado", actions: (0, jsx_runtime_1.jsx)("input", { className: "month-input", type: "month", value: month, onChange: e => setMonth(e.target.value) }) }), error ? ((0, jsx_runtime_1.jsx)("div", { className: "panel form-error", children: error })) : !data ? ((0, jsx_runtime_1.jsx)("div", { className: "panel", children: "Carregando dados..." })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("section", { className: "financial-health panel", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "panel-kicker", children: "Leitura do mês" }), (0, jsx_runtime_1.jsx)("h3", { children: data.health_message || 'Acompanhe o que entra, sai e já está comprometido.' })] }), (0, jsx_runtime_1.jsxs)("div", { className: "health-metrics", children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("small", { children: "Renda comprometida" }), (0, jsx_runtime_1.jsxs)("strong", { children: [Number(data.commitment_percent || 0).toFixed(0), "%"] })] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("small", { children: "Faturas do mês" }), (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(Number(data.card_total || 0)) })] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("small", { children: "Falta pagar" }), (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(remainingToPay) })] }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("small", { children: "Orçamentos acima" }), (0, jsx_runtime_1.jsx)("strong", { children: data.budget_over_count || 0 })] })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "summary-grid dashboard-section-grid", children: [(0, jsx_runtime_1.jsxs)("article", { className: "summary-card", children: [(0, jsx_runtime_1.jsx)("span", { children: "Renda prevista" }), (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(data.income_expected) }), (0, jsx_runtime_1.jsx)("small", { children: changeLabel(data.income_change_percent) })] }), (0, jsx_runtime_1.jsxs)("article", { className: "summary-card", children: [(0, jsx_runtime_1.jsx)("span", { children: "Despesas previstas" }), (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(data.expense_expected) }), (0, jsx_runtime_1.jsx)("small", { children: changeLabel(data.expense_change_percent) })] }), (0, jsx_runtime_1.jsxs)("article", { className: `summary-card ${data.balance_expected < 0 ? 'negative' : 'positive'}`, children: [(0, jsx_runtime_1.jsx)("span", { children: "Saldo previsto" }), (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(data.balance_expected) }), (0, jsx_runtime_1.jsxs)("small", { children: ["Saldo real: ", (0, api_1.money)(data.balance_real)] })] }), (0, jsx_runtime_1.jsxs)("article", { className: "summary-card", children: [(0, jsx_runtime_1.jsx)("span", { children: "Pendências" }), (0, jsx_runtime_1.jsx)("strong", { children: data.pending_expenses }), (0, jsx_runtime_1.jsxs)("small", { children: [data.entries, " lançamentos no mês"] })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "dashboard-insight-grid dashboard-section-grid", children: [(0, jsx_runtime_1.jsxs)("article", { className: "panel insight-card", children: [(0, jsx_runtime_1.jsx)("span", { children: "Maior categoria" }), (0, jsx_runtime_1.jsx)("strong", { children: data.largest_category?.category_name || categoryRows[0]?.name || 'Sem dados' }), (0, jsx_runtime_1.jsx)("small", { children: (0, api_1.money)(Number(data.largest_category?.total || categoryRows[0]?.total || 0)) })] }), (0, jsx_runtime_1.jsxs)("article", { className: "panel insight-card", children: [(0, jsx_runtime_1.jsx)("span", { children: "Próximo vencimento" }), (0, jsx_runtime_1.jsx)("strong", { children: data.next_due?.description || 'Nenhuma pendência próxima' }), (0, jsx_runtime_1.jsx)("small", { children: data.next_due ? `${data.next_due.date} • ${(0, api_1.money)(data.next_due.amount)}` : 'Tudo certo por aqui' })] }), (0, jsx_runtime_1.jsxs)("article", { className: "panel insight-card", children: [(0, jsx_runtime_1.jsx)("span", { children: "Comprometimento" }), (0, jsx_runtime_1.jsxs)("strong", { children: [Number(data.commitment_percent || 0).toFixed(1), "%"] }), (0, jsx_runtime_1.jsx)("small", { children: "das rendas previstas já destinadas a despesas" })] }), (0, jsx_runtime_1.jsxs)("article", { className: "panel insight-card", children: [(0, jsx_runtime_1.jsx)("span", { children: "Em aberto" }), (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(remainingToPay) }), (0, jsx_runtime_1.jsx)("small", { children: remainingToReceive > 0 ? `A receber no mês: ${(0, api_1.money)(remainingToReceive)}` : 'Tudo que falta pagar já está destacado acima.' })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "chart-grid dashboard-progress-grid dashboard-section-grid", children: [(0, jsx_runtime_1.jsxs)("article", { className: "panel chart-panel progress-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "panel-heading-copy", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Andamento do mês" }), (0, jsx_runtime_1.jsx)("p", { children: "Quanto já entrou ou foi pago e o que ainda falta." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "progress-summary-list", children: [(0, jsx_runtime_1.jsx)(ProgressSummary, { title: "Recebimento das rendas", completedLabel: "Recebido", pendingLabel: "A receber", completed: data.income_received, total: data.income_expected, tone: "income" }), (0, jsx_runtime_1.jsx)(ProgressSummary, { title: "Pagamento das despesas", completedLabel: "Pago", pendingLabel: "A pagar", completed: data.expense_paid, total: data.expense_expected, tone: "expense" })] })] }), (0, jsx_runtime_1.jsxs)("article", { className: "panel chart-panel dashboard-category-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "panel-heading-copy", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Despesas por categoria" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Participação de cada categoria no total de ", (0, api_1.money)(categoryTotal), "."] })] }), categoryRows.length
                        ? (0, jsx_runtime_1.jsx)("div", { className: "category-progress-list", children: categoryRows.map(item => ((0, jsx_runtime_1.jsx)(CategoryBar, { label: item.name, value: item.total, total: categoryTotal }, item.name))) })
                        : (0, jsx_runtime_1.jsx)("p", { className: "empty", children: "Nenhuma despesa registrada." })] })] })] }))] });
}

},
"src/pages/ExpensesPage.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ExpensesPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const EmptyState_1 = __importDefault(require("src/components/EmptyState.tsx"));
const ModalCard_1 = __importDefault(require("src/components/ModalCard.tsx"));
const PageHeader_1 = __importDefault(require("src/components/PageHeader.tsx"));
const MoneyInput_1 = __importDefault(require("src/components/MoneyInput.tsx"));
const api_1 = require("src/services/api.ts");
const confirm_1 = require("src/services/confirm.ts");
const navigation_1 = require("src/services/navigation.ts");
const toast_1 = require("src/services/toast.ts");
function payloadFromExpense(item, changes = {}) {
    const value = { ...item, ...changes };
    return {
        description: value.description,
        amount: Number(value.amount),
        purchase_date: value.purchase_date,
        due_date: value.due_date,
        paid_date: value.status === 'paid' ? value.paid_date || value.due_date : null,
        category_id: value.category_id ?? null,
        expense_type: value.expense_type || 'variable',
        payment_method: value.payment_method || 'pix',
        merchant: value.merchant || '',
        notes: value.notes || '',
        status: value.status,
        account_id: value.account_id ?? null,
        card_id: value.card_id ?? null,
        installments: 1,
        list_month: value.due_date?.slice(0, 7) || value.list_month || value.billing_month,
        external_id: value.external_id || null,
    };
}
function expenseDescription(item) {
    if (!item.card_id)
        return item.description;
    return item.description
        .replace(/^Fatura\s+do\s+(?=Cart[aã]o\b)/i, '')
        .replace(/^Fatura\s+(?=Cart[aã]o\b)/i, '')
        .trim();
}
function monthLabel(value) {
    const [year, month] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}
function mergeExpenses(current, incoming) {
    const incomingIds = new Set(incoming.map((item) => item.id));
    return [...incoming, ...current.filter((item) => !incomingIds.has(item.id))];
}
function expenseDeadlineClass(item) {
    if (item.status === 'paid')
        return 'expense-deadline-paid';
    if (!item.due_date)
        return '';
    const [year, month, day] = item.due_date.split('-').map(Number);
    const due = new Date(year, month - 1, day);
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const difference = Math.round((due.getTime() - todayLocal.getTime()) / 86400000);
    if (difference < 0)
        return 'expense-deadline-overdue';
    if (difference <= 7)
        return 'expense-deadline-soon';
    return '';
}
function expenseDeadlineTitle(item) {
    const state = expenseDeadlineClass(item);
    if (state === 'expense-deadline-paid')
        return 'Despesa paga';
    if (state === 'expense-deadline-overdue')
        return 'Despesa vencida';
    if (state === 'expense-deadline-soon')
        return 'Vencimento próximo';
    return '';
}
function paymentMethodLabel(value) {
    const labels = {
        pix: 'Pix', debit: 'Débito', cash: 'Dinheiro', transfer: 'Transferência', boleto: 'Boleto', credit_card: 'Cartão de crédito',
    };
    return labels[value] || value || 'Não informada';
}
function formatDate(value) {
    if (!value)
        return 'Não informada';
    const [year, month, day] = value.split('-');
    return year && month && day ? `${day}/${month}/${year}` : value;
}
function ExpensesPage() {
    const route = (0, navigation_1.readNavigationTarget)('expenses');
    const targetId = route.itemId;
    const [month, setMonth] = (0, react_1.useState)(route.month || (0, api_1.currentMonth)());
    const [items, setItems] = (0, react_1.useState)([]);
    const [accounts, setAccounts] = (0, react_1.useState)([]);
    const [cards, setCards] = (0, react_1.useState)([]);
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [fixed, setFixed] = (0, react_1.useState)(false);
    const [paymentMethod, setPaymentMethod] = (0, react_1.useState)('pix');
    const [expenseStatus, setExpenseStatus] = (0, react_1.useState)('pending');
    const [paidDate, setPaidDate] = (0, react_1.useState)('');
    const [editing, setEditing] = (0, react_1.useState)(null);
    const [selectedExpense, setSelectedExpense] = (0, react_1.useState)(null);
    const [attachmentUrl, setAttachmentUrl] = (0, react_1.useState)('');
    const [attachmentLoading, setAttachmentLoading] = (0, react_1.useState)(false);
    const [attachmentError, setAttachmentError] = (0, react_1.useState)('');
    const [fullscreenAttachment, setFullscreenAttachment] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    const [loadingItems, setLoadingItems] = (0, react_1.useState)(false);
    const [filterText, setFilterText] = (0, react_1.useState)('');
    const [filterStatus, setFilterStatus] = (0, react_1.useState)('all');
    const [filterCategory, setFilterCategory] = (0, react_1.useState)('all');
    const [filterPayment, setFilterPayment] = (0, react_1.useState)('all');
    const requestVersion = (0, react_1.useRef)(0);
    const loadExpenses = (0, react_1.useCallback)(async (selectedMonth) => {
        const request = ++requestVersion.current;
        setLoadingItems(true);
        try {
            // O marcador refresh e cache=no-store impedem que o navegador reutilize uma
            // resposta anterior. O contador evita que uma requisição lenta de outro mês
            // sobrescreva a lista mais recente.
            const data = await (0, api_1.api)(`/expenses?month=${encodeURIComponent(selectedMonth)}&refresh=${Date.now()}`, { cache: 'no-store' });
            if (request === requestVersion.current) {
                setItems(data);
                setError('');
            }
        }
        catch (err) {
            if (request === requestVersion.current) {
                const message = err instanceof Error ? err.message : 'Erro ao carregar despesas';
                setError(message);
                toast_1.toast.error('Não foi possível atualizar as despesas', message);
            }
        }
        finally {
            if (request === requestVersion.current)
                setLoadingItems(false);
        }
    }, []);
    const loadLookups = (0, react_1.useCallback)(async () => {
        const results = await Promise.allSettled([
            (0, api_1.api)('/accounts', { cache: 'no-store' }),
            (0, api_1.api)('/cards', { cache: 'no-store' }),
            (0, api_1.api)('/categories?kind=expense', { cache: 'no-store' }),
        ]);
        if (results[0].status === 'fulfilled')
            setAccounts(results[0].value);
        if (results[1].status === 'fulfilled')
            setCards(results[1].value);
        if (results[2].status === 'fulfilled')
            setCategories(results[2].value);
        const failure = results.find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected')
            setError(failure.reason instanceof Error ? failure.reason.message : 'Erro ao carregar opções do formulário');
    }, []);
    (0, react_1.useEffect)(() => {
        setItems([]);
        void loadExpenses(month);
    }, [month, loadExpenses]);
    (0, react_1.useEffect)(() => { void loadLookups(); }, [loadLookups]);
    (0, react_1.useEffect)(() => {
        if (fixed && paymentMethod === 'credit_card')
            setPaymentMethod('pix');
    }, [fixed, paymentMethod]);
    (0, react_1.useEffect)(() => {
        const refresh = () => void loadExpenses(month);
        const onVisibility = () => { if (document.visibilityState === 'visible')
            refresh(); };
        window.addEventListener('focus', refresh);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            window.removeEventListener('focus', refresh);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [month, loadExpenses]);
    (0, react_1.useEffect)(() => {
        if (targetId && items.some((item) => item.id === targetId))
            (0, navigation_1.scrollToTarget)(`[data-expense-id="${targetId}"]`);
    }, [items, targetId]);
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        let objectUrl = '';
        setAttachmentUrl('');
        setAttachmentError('');
        setFullscreenAttachment(false);
        if (!selectedExpense?.attachment_path) {
            setAttachmentLoading(false);
            return () => undefined;
        }
        setAttachmentLoading(true);
        (0, api_1.api)(`/expenses/${selectedExpense.id}/attachment`, { cache: 'no-store' })
            .then((blob) => {
            if (cancelled)
                return;
            objectUrl = URL.createObjectURL(blob);
            setAttachmentUrl(objectUrl);
        })
            .catch((err) => {
            if (!cancelled)
                setAttachmentError(err instanceof Error ? err.message : 'Não foi possível abrir o comprovante.');
        })
            .finally(() => { if (!cancelled)
            setAttachmentLoading(false); });
        return () => {
            cancelled = true;
            if (objectUrl)
                URL.revokeObjectURL(objectUrl);
        };
    }, [selectedExpense?.id, selectedExpense?.attachment_path]);
    (0, react_1.useEffect)(() => {
        if (!fullscreenAttachment)
            return;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const closeOnEscape = (event) => {
            if (event.key === 'Escape')
                setFullscreenAttachment(false);
        };
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [fullscreenAttachment]);
    function openNew() {
        setEditing(null);
        setFixed(false);
        setPaymentMethod('pix');
        setExpenseStatus('pending');
        setPaidDate('');
        setError('');
        setShowForm(true);
    }
    function openEdit(item) {
        setEditing(item);
        setFixed(Boolean(item.recurrence_id));
        setPaymentMethod(item.card_id ? 'credit_card' : item.payment_method || 'pix');
        setExpenseStatus(item.status || 'pending');
        setPaidDate(item.paid_date || '');
        setError('');
        setShowForm(true);
        window.requestAnimationFrame(() => document.getElementById('expense-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    function closeForm() {
        setShowForm(false);
        setEditing(null);
        setFixed(false);
        setExpenseStatus('pending');
        setPaidDate('');
    }
    async function submit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const usesCard = paymentMethod === 'credit_card';
        const purchaseDate = usesCard
            ? String(form.get('purchase_date') || editing?.purchase_date || (0, api_1.today)())
            : String(editing?.purchase_date || (0, api_1.today)());
        const dueDate = String(form.get('due_date') || editing?.due_date || `${month}-10`);
        const normalizedStatus = paidDate ? 'paid' : expenseStatus;
        const normalizedPaidDate = normalizedStatus === 'paid' ? (paidDate || (0, api_1.today)()) : null;
        try {
            setError('');
            if (editing) {
                const cardId = usesCard && form.get('card_id') ? Number(form.get('card_id')) : null;
                const updated = await (0, api_1.api)(`/expenses/${editing.id}`, { method: 'PATCH', ...(0, api_1.jsonBody)({
                        description: form.get('description'), amount: Number(form.get('amount')), purchase_date: purchaseDate,
                        due_date: dueDate, paid_date: normalizedPaidDate,
                        category_id: form.get('category_id') ? Number(form.get('category_id')) : null, expense_type: editing.expense_type || 'variable',
                        payment_method: cardId ? 'credit_card' : paymentMethod, merchant: form.get('merchant') || '', notes: form.get('notes') || '',
                        status: normalizedStatus, account_id: form.get('account_id') ? Number(form.get('account_id')) : null,
                        card_id: cardId, installments: 1, list_month: dueDate.slice(0, 7),
                    }) });
                if (editing.recurrence_id && !fixed) {
                    await (0, api_1.api)(`/recurring-expenses/${editing.recurrence_id}/stop?from_month=${month}&remove_future=true`, { method: 'POST' });
                }
                setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
                closeForm();
                await loadExpenses(month);
                toast_1.toast.success('Despesa atualizada', updated.list_month !== month ? `${updated.description} agora aparece em ${monthLabel(updated.list_month)}, mês do vencimento.` : `${updated.description} foi atualizada.`);
            }
            else if (fixed) {
                const result = await (0, api_1.api)('/recurring-expenses', { method: 'POST', ...(0, api_1.jsonBody)({
                        description: form.get('description'), amount: Number(form.get('amount')), due_day: Number(form.get('due_day')),
                        category_id: form.get('category_id') ? Number(form.get('category_id')) : null, payment_method: paymentMethod,
                        merchant: form.get('merchant') || '', account_id: form.get('account_id') ? Number(form.get('account_id')) : null,
                        start_month: month, end_month: form.get('end_month') || null, months_to_generate: Number(form.get('months_to_generate') || 12),
                    }) });
                closeForm();
                await loadExpenses(month);
                toast_1.toast.success('Gasto fixo criado', `${result.generated || 0} lançamento(s) mensal(is) foram gerados.`);
            }
            else {
                const cardId = usesCard && form.get('card_id') ? Number(form.get('card_id')) : null;
                const created = await (0, api_1.api)('/expenses', { method: 'POST', ...(0, api_1.jsonBody)({
                        description: form.get('description'), amount: Number(form.get('amount')), purchase_date: purchaseDate,
                        due_date: dueDate, paid_date: normalizedPaidDate,
                        category_id: form.get('category_id') ? Number(form.get('category_id')) : null, expense_type: 'variable',
                        payment_method: cardId ? 'credit_card' : paymentMethod, merchant: form.get('merchant') || '', notes: form.get('notes') || '',
                        status: normalizedStatus, account_id: form.get('account_id') ? Number(form.get('account_id')) : null,
                        card_id: cardId, installments: Number(form.get('installments') || 1), list_month: dueDate.slice(0, 7),
                    }) });
                const visibleNow = created.filter((item) => item.list_month === month);
                setItems((current) => mergeExpenses(current, visibleNow));
                closeForm();
                await loadExpenses(month);
                const first = created[0];
                const targetMonth = first?.list_month || month;
                const dueMonthMessage = targetMonth !== month
                    ? ` Como o vencimento é em ${monthLabel(targetMonth)}, o lançamento foi enviado para esse mês.`
                    : ` O lançamento aparece em ${monthLabel(targetMonth)}.`;
                toast_1.toast.success('Despesa salva', `${created.length} lançamento(s) adicionado(s).${dueMonthMessage}`);
            }
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao salvar';
            setError(message);
            toast_1.toast.error('Não foi possível salvar a despesa', message);
        }
    }
    async function stopRecurrence(item) {
        if (!item.recurrence_id)
            return;
        const confirmed = await (0, confirm_1.confirmAction)({
            title: 'Parar despesa recorrente?',
            message: 'Os próximos lançamentos pendentes desta despesa serão removidos.',
            detail: 'O mês atual e despesas já pagas são preservados. Você pode continuar editando apenas esta ocorrência.',
            confirmLabel: 'Parar recorrência',
            tone: 'warning',
        });
        if (!confirmed)
            return;
        try {
            const result = await (0, api_1.api)(`/recurring-expenses/${item.recurrence_id}/stop?from_month=${month}&remove_future=true`, { method: 'POST' });
            setFixed(false);
            if (editing?.id === item.id)
                setEditing({ ...item, recurrence_id: undefined });
            await loadExpenses(month);
            toast_1.toast.success('Recorrência desativada', `${result.removed || 0} lançamento(s) futuro(s) pendente(s) foram removidos.`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao parar recorrência';
            setError(message);
            toast_1.toast.error('Não foi possível parar a recorrência', message);
        }
    }
    async function markPaid(item) {
        try {
            setError('');
            const updated = await (0, api_1.api)(`/expenses/${item.id}`, { method: 'PATCH', ...(0, api_1.jsonBody)(payloadFromExpense(item, { status: 'paid', paid_date: (0, api_1.today)() })) });
            setItems((current) => current.map((expense) => expense.id === updated.id ? updated : expense));
            await loadExpenses(month);
            toast_1.toast.success('Pagamento registrado', `${item.description} foi marcada como paga.`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao registrar pagamento';
            setError(message);
            toast_1.toast.error('Pagamento não registrado', message);
        }
    }
    async function remove(id) {
        const item = items.find((expense) => expense.id === id);
        const confirmed = await (0, confirm_1.confirmAction)({
            title: 'Excluir despesa?',
            message: item ? `${item.description} será removida da lista.` : 'Esta despesa será removida da lista.',
            detail: 'O comprovante vinculado e os dados deste lançamento também deixarão de aparecer no sistema.',
            confirmLabel: 'Excluir despesa',
            tone: 'danger',
        });
        if (!confirmed)
            return;
        try {
            await (0, api_1.api)(`/expenses/${id}`, { method: 'DELETE' });
            setItems((current) => current.filter((expense) => expense.id !== id));
            if (selectedExpense?.id === id)
                setSelectedExpense(null);
            await loadExpenses(month);
            toast_1.toast.success('Despesa excluída', 'O lançamento foi removido da lista.');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao excluir';
            setError(message);
            toast_1.toast.error('Não foi possível excluir', message);
        }
    }
    async function uploadAttachment(id, file) {
        if (!file)
            return;
        const body = new FormData();
        body.append('file', file);
        try {
            await (0, api_1.api)(`/expenses/${id}/attachment`, { method: 'POST', body });
            await loadExpenses(month);
            toast_1.toast.success('Comprovante anexado', file.name);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao anexar comprovante';
            setError(message);
            toast_1.toast.error('Não foi possível anexar', message);
        }
    }
    const normalizedFilter = filterText.trim().toLocaleLowerCase('pt-BR');
    const filteredItems = items.filter((item) => {
        if (normalizedFilter && !`${item.description} ${item.merchant || ''} ${item.notes || ''}`.toLocaleLowerCase('pt-BR').includes(normalizedFilter))
            return false;
        if (filterStatus !== 'all' && item.status !== filterStatus)
            return false;
        if (filterCategory !== 'all' && String(item.category_id || '') !== filterCategory)
            return false;
        const effectivePayment = item.card_id ? 'credit_card' : (item.payment_method || '');
        if (filterPayment !== 'all' && effectivePayment !== filterPayment)
            return false;
        return true;
    });
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageHeader_1.default, { title: "Despesas", subtitle: "Gastos fixos, vari\u00E1veis, cart\u00F5es e parcelamentos", actions: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("input", { className: "month-input", type: "month", value: month, onChange: (e) => setMonth(e.target.value) }), (0, jsx_runtime_1.jsx)("button", { className: "primary-button compact", onClick: openNew, children: "+ Nova despesa" })] }) }), showForm && (0, jsx_runtime_1.jsx)(ModalCard_1.default, { onClose: closeForm, label: editing ? `Editar despesa ${editing.description}` : 'Nova despesa', wide: true, children: (0, jsx_runtime_1.jsxs)("form", { id: "expense-form", className: "panel form-grid modal-form", onSubmit: submit, children: [(0, jsx_runtime_1.jsx)("h3", { className: "form-title wide", children: editing ? 'Editar despesa ou pagamento' : 'Nova despesa' }), !editing && (0, jsx_runtime_1.jsxs)("label", { className: "toggle-line wide", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: fixed, onChange: (e) => setFixed(e.target.checked) }), " Criar como gasto fixo mensal"] }), editing?.recurrence_id && (0, jsx_runtime_1.jsxs)("div", { className: "recurrence-control wide", children: [(0, jsx_runtime_1.jsxs)("label", { className: "toggle-line", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: fixed, onChange: (e) => setFixed(e.target.checked) }), " Manter despesa recorrente"] }), (0, jsx_runtime_1.jsx)("small", { children: "Desmarque e salve para remover os lan\u00E7amentos futuros pendentes. A ocorr\u00EAncia atual permanece." })] }), (0, jsx_runtime_1.jsxs)("label", { className: "wide", children: ["Descri\u00E7\u00E3o", (0, jsx_runtime_1.jsx)("input", { name: "description", required: true, defaultValue: editing?.description || '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Valor", (0, jsx_runtime_1.jsx)(MoneyInput_1.default, { name: "amount", required: true, defaultValue: editing ? Number(editing.amount) : '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Categoria", (0, jsx_runtime_1.jsxs)("select", { name: "category_id", defaultValue: editing?.category_id || '', children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Sem categoria" }), categories.map((item) => (0, jsx_runtime_1.jsx)("option", { value: item.id, children: item.name }, item.id))] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Estabelecimento", (0, jsx_runtime_1.jsx)("input", { name: "merchant", defaultValue: editing?.merchant || '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Forma de pagamento", (0, jsx_runtime_1.jsxs)("select", { name: "payment_method", value: paymentMethod, onChange: (event) => setPaymentMethod(event.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "pix", children: "Pix" }), (0, jsx_runtime_1.jsx)("option", { value: "debit", children: "D\u00E9bito" }), (0, jsx_runtime_1.jsx)("option", { value: "cash", children: "Dinheiro" }), (0, jsx_runtime_1.jsx)("option", { value: "transfer", children: "Transfer\u00EAncia" }), (0, jsx_runtime_1.jsx)("option", { value: "boleto", children: "Boleto" }), !fixed && (0, jsx_runtime_1.jsx)("option", { value: "credit_card", children: "Cart\u00E3o de cr\u00E9dito" })] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Conta", (0, jsx_runtime_1.jsxs)("select", { name: "account_id", defaultValue: editing?.account_id || '', children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "N\u00E3o informada" }), accounts.map((item) => (0, jsx_runtime_1.jsx)("option", { value: item.id, children: item.name }, item.id))] })] }), (!fixed || editing) ? (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [paymentMethod !== 'credit_card' ? (0, jsx_runtime_1.jsxs)("label", { children: ["Vencimento", (0, jsx_runtime_1.jsx)("input", { name: "due_date", type: "date", defaultValue: editing?.due_date || `${month}-10`, required: true })] }) : (0, jsx_runtime_1.jsxs)("div", { className: "card-due-auto", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Vencimento autom\u00E1tico" }), (0, jsx_runtime_1.jsx)("small", { children: "O Smart Finance calcula a fatura pela data da compra, fechamento e vencimento configurados no cart\u00E3o." }), (0, jsx_runtime_1.jsx)("input", { name: "due_date", type: "hidden", value: editing?.due_date || `${month}-10` })] }), paymentMethod === 'credit_card' && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("label", { children: ["Data da compra", (0, jsx_runtime_1.jsx)("input", { name: "purchase_date", type: "date", defaultValue: editing?.purchase_date || (0, api_1.today)(), required: true })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Cart\u00E3o", (0, jsx_runtime_1.jsxs)("select", { name: "card_id", defaultValue: editing?.card_id || '', required: true, children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Selecione o cart\u00E3o" }), cards.map((item) => (0, jsx_runtime_1.jsx)("option", { value: item.id, children: item.name }, item.id))] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Parcelas", (0, jsx_runtime_1.jsx)("input", { name: "installments", type: "number", min: "1", max: "360", defaultValue: "1", disabled: Boolean(editing) }), editing?.total_installments && (0, jsx_runtime_1.jsxs)("small", { children: ["Esta edi\u00E7\u00E3o altera somente a parcela ", editing.installment_number, "/", editing.total_installments, "."] })] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Situa\u00E7\u00E3o", (0, jsx_runtime_1.jsxs)("select", { name: "status", value: expenseStatus, onChange: (event) => {
                                                const nextStatus = event.target.value;
                                                setExpenseStatus(nextStatus);
                                                if (nextStatus === 'pending')
                                                    setPaidDate('');
                                                if (nextStatus === 'paid' && !paidDate)
                                                    setPaidDate((0, api_1.today)());
                                            }, children: [(0, jsx_runtime_1.jsx)("option", { value: "pending", children: "Pendente" }), (0, jsx_runtime_1.jsx)("option", { value: "paid", children: "Paga" })] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Data do pagamento", (0, jsx_runtime_1.jsx)("input", { name: "paid_date", type: "date", value: paidDate, onChange: (event) => {
                                                const nextDate = event.target.value;
                                                setPaidDate(nextDate);
                                                if (nextDate)
                                                    setExpenseStatus('paid');
                                            } }), (0, jsx_runtime_1.jsx)("small", { children: paidDate ? 'Ao informar uma data, a despesa será marcada como paga.' : 'Preencha para registrar o pagamento.' })] }), (0, jsx_runtime_1.jsxs)("label", { className: "wide", children: ["Observa\u00E7\u00F5es", (0, jsx_runtime_1.jsx)("textarea", { name: "notes", rows: 2, defaultValue: editing?.notes || '' })] })] }) : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("label", { children: ["Dia do vencimento", (0, jsx_runtime_1.jsx)("input", { name: "due_day", type: "number", min: "1", max: "31", defaultValue: "10", required: true })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Gerar pr\u00F3ximos meses", (0, jsx_runtime_1.jsx)("input", { name: "months_to_generate", type: "number", min: "1", max: "120", defaultValue: "12" })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["M\u00EAs final opcional", (0, jsx_runtime_1.jsx)("input", { name: "end_month", type: "month" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "primary-button", children: editing ? 'Salvar alterações' : 'Salvar' }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "secondary-button", onClick: closeForm, children: "Cancelar" })] })] }, editing?.id || 'new-expense') }), selectedExpense && (0, jsx_runtime_1.jsx)(ModalCard_1.default, { onClose: () => setSelectedExpense(null), label: `Detalhes da despesa ${selectedExpense.description}`, wide: true, children: (0, jsx_runtime_1.jsxs)("article", { className: "panel expense-detail-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "expense-detail-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("small", { children: "Despesa" }), (0, jsx_runtime_1.jsx)("h3", { children: expenseDescription(selectedExpense) })] }), (0, jsx_runtime_1.jsx)("span", { className: `status ${selectedExpense.status}`, children: selectedExpense.status === 'paid' ? 'Paga' : 'Pendente' })] }), (0, jsx_runtime_1.jsxs)("dl", { className: "expense-detail-grid", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Valor" }), (0, jsx_runtime_1.jsx)("dd", { children: (0, api_1.money)(Number(selectedExpense.amount)) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Vencimento" }), (0, jsx_runtime_1.jsx)("dd", { children: formatDate(selectedExpense.due_date) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Forma de pagamento" }), (0, jsx_runtime_1.jsx)("dd", { children: paymentMethodLabel(selectedExpense.card_id ? 'credit_card' : selectedExpense.payment_method) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Conta" }), (0, jsx_runtime_1.jsx)("dd", { children: accounts.find((item) => item.id === selectedExpense.account_id)?.name || 'Não informada' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Categoria" }), (0, jsx_runtime_1.jsx)("dd", { children: categories.find((item) => item.id === selectedExpense.category_id)?.name || 'Sem categoria' })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Estabelecimento" }), (0, jsx_runtime_1.jsx)("dd", { children: selectedExpense.merchant || 'Não informado' })] }), selectedExpense.card_id && (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Cart\u00E3o" }), (0, jsx_runtime_1.jsx)("dd", { children: cards.find((item) => item.id === selectedExpense.card_id)?.name || 'Cartão' })] }), selectedExpense.card_id && (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Data da compra" }), (0, jsx_runtime_1.jsx)("dd", { children: formatDate(selectedExpense.purchase_date) })] }), selectedExpense.paid_date && (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Data do pagamento" }), (0, jsx_runtime_1.jsx)("dd", { children: formatDate(selectedExpense.paid_date) })] }), selectedExpense.installment_number && (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Parcela" }), (0, jsx_runtime_1.jsxs)("dd", { children: [selectedExpense.installment_number, "/", selectedExpense.total_installments] })] }), selectedExpense.recurrence_id && (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Recorr\u00EAncia" }), (0, jsx_runtime_1.jsx)("dd", { children: "Despesa recorrente mensal" })] })] }), selectedExpense.notes && (0, jsx_runtime_1.jsxs)("div", { className: "expense-detail-notes", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Observa\u00E7\u00F5es" }), (0, jsx_runtime_1.jsx)("p", { children: selectedExpense.notes })] }), (0, jsx_runtime_1.jsxs)("section", { className: "expense-attachment-preview", children: [(0, jsx_runtime_1.jsx)("h4", { children: "Comprovante" }), !selectedExpense.attachment_path && (0, jsx_runtime_1.jsx)("p", { className: "muted-text", children: "Nenhum comprovante anexado." }), attachmentLoading && (0, jsx_runtime_1.jsx)("p", { className: "muted-text", children: "Carregando comprovante..." }), attachmentError && (0, jsx_runtime_1.jsx)("div", { className: "form-error", children: attachmentError }), attachmentUrl && selectedExpense.attachment_path?.toLowerCase().endsWith('.pdf') && (0, jsx_runtime_1.jsx)("a", { className: "secondary-button attachment-open-button", href: attachmentUrl, target: "_blank", rel: "noreferrer", children: "Abrir comprovante em PDF" }), attachmentUrl && !selectedExpense.attachment_path?.toLowerCase().endsWith('.pdf') && (0, jsx_runtime_1.jsxs)("button", { type: "button", className: "expense-attachment-image-button", onClick: () => setFullscreenAttachment(true), "aria-label": "Abrir comprovante em tela cheia", children: [(0, jsx_runtime_1.jsx)("img", { className: "expense-attachment-image", src: attachmentUrl, alt: `Comprovante de ${selectedExpense.description}` }), (0, jsx_runtime_1.jsx)("small", { children: "Toque na imagem para abrir em tela cheia" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "form-actions", children: (0, jsx_runtime_1.jsx)("button", { className: "secondary-button", onClick: () => setSelectedExpense(null), children: "Fechar" }) })] }) }), fullscreenAttachment && attachmentUrl && (0, jsx_runtime_1.jsxs)("div", { className: "attachment-lightbox", role: "dialog", "aria-modal": "true", "aria-label": "Comprovante em tela cheia", onClick: () => setFullscreenAttachment(false), children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "attachment-lightbox-close", onClick: () => setFullscreenAttachment(false), "aria-label": "Fechar comprovante", children: "\u00D7" }), (0, jsx_runtime_1.jsx)("img", { className: "attachment-lightbox-image", src: attachmentUrl, alt: `Comprovante de ${selectedExpense?.description || 'despesa'}`, onClick: (event) => event.stopPropagation() })] }), error && (0, jsx_runtime_1.jsx)("div", { className: "form-error", children: error }), loadingItems && (0, jsx_runtime_1.jsxs)("div", { className: "list-refresh-indicator", children: [(0, jsx_runtime_1.jsx)("span", {}), " Atualizando despesas..."] }), (0, jsx_runtime_1.jsxs)("div", { className: "expense-deadline-legend", "aria-label": "Legenda dos vencimentos", children: [(0, jsx_runtime_1.jsx)("span", { className: "paid", children: "Pago" }), (0, jsx_runtime_1.jsx)("span", { className: "soon", children: "Vence em at\u00E9 7 dias" }), (0, jsx_runtime_1.jsx)("span", { className: "overdue", children: "Vencido" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "advanced-filters panel", "aria-label": "Filtros avan\u00E7ados de despesas", children: [(0, jsx_runtime_1.jsx)("input", { value: filterText, onChange: (e) => setFilterText(e.target.value), placeholder: "Buscar descri\u00E7\u00E3o, estabelecimento ou observa\u00E7\u00E3o" }), (0, jsx_runtime_1.jsxs)("select", { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "all", children: "Todos os status" }), (0, jsx_runtime_1.jsx)("option", { value: "pending", children: "Pendentes" }), (0, jsx_runtime_1.jsx)("option", { value: "paid", children: "Pagas" })] }), (0, jsx_runtime_1.jsxs)("select", { value: filterCategory, onChange: (e) => setFilterCategory(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "all", children: "Todas as categorias" }), categories.map((item) => (0, jsx_runtime_1.jsx)("option", { value: String(item.id), children: item.name }, item.id))] }), (0, jsx_runtime_1.jsxs)("select", { value: filterPayment, onChange: (e) => setFilterPayment(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "all", children: "Todas as formas" }), (0, jsx_runtime_1.jsx)("option", { value: "pix", children: "Pix" }), (0, jsx_runtime_1.jsx)("option", { value: "debit", children: "D\u00E9bito" }), (0, jsx_runtime_1.jsx)("option", { value: "cash", children: "Dinheiro" }), (0, jsx_runtime_1.jsx)("option", { value: "transfer", children: "Transfer\u00EAncia" }), (0, jsx_runtime_1.jsx)("option", { value: "boleto", children: "Boleto" }), (0, jsx_runtime_1.jsx)("option", { value: "credit_card", children: "Cart\u00E3o de cr\u00E9dito" })] }), (filterText || filterStatus !== 'all' || filterCategory !== 'all' || filterPayment !== 'all') && (0, jsx_runtime_1.jsx)("button", { type: "button", className: "secondary-button compact", onClick: () => { setFilterText(''); setFilterStatus('all'); setFilterCategory('all'); setFilterPayment('all'); }, children: "Limpar filtros" })] }), (0, jsx_runtime_1.jsxs)("section", { className: "table-panel", children: [(0, jsx_runtime_1.jsxs)("table", { className: "expenses-table", children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Descri\u00E7\u00E3o" }), (0, jsx_runtime_1.jsx)("th", { children: "Vencimento" }), (0, jsx_runtime_1.jsx)("th", { children: "Tipo" }), (0, jsx_runtime_1.jsx)("th", { children: "Valor" }), (0, jsx_runtime_1.jsx)("th", { children: "Status" }), (0, jsx_runtime_1.jsx)("th", { className: "expense-action-heading", children: "Pagar" }), (0, jsx_runtime_1.jsx)("th", { className: "expense-action-heading", children: "Editar" }), (0, jsx_runtime_1.jsx)("th", { className: "expense-action-heading", children: "Anexar" }), (0, jsx_runtime_1.jsx)("th", { className: "expense-action-heading", children: "Excluir" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: filteredItems.map((item) => (0, jsx_runtime_1.jsxs)("tr", { "data-expense-id": item.id, tabIndex: 0, title: `${expenseDeadlineTitle(item)}${expenseDeadlineTitle(item) ? ' • ' : ''}Clique para ver os detalhes`, className: [targetId === item.id ? 'target-row' : '', expenseDeadlineClass(item), 'expense-row-clickable'].filter(Boolean).join(' '), onClick: () => setSelectedExpense(item), onKeyDown: (event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            setSelectedExpense(item);
                                        }
                                    }, children: [(0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsxs)("div", { className: "expense-description", children: [(0, jsx_runtime_1.jsx)("strong", { children: expenseDescription(item) }), item.recurrence_id && (0, jsx_runtime_1.jsx)("small", { className: "recurrence-badge", children: "\u21BB Recorrente" }), item.installment_number && (0, jsx_runtime_1.jsxs)("small", { className: "block", children: ["Parcela ", item.installment_number, "/", item.total_installments] }), item.attachment_path && (0, jsx_runtime_1.jsx)("small", { className: "block expense-has-attachment", children: "\uD83D\uDCCE Comprovante anexado" })] }) }), (0, jsx_runtime_1.jsx)("td", { children: item.due_date }), (0, jsx_runtime_1.jsx)("td", { children: item.card_id ? 'Cartão' : item.expense_type === 'fixed' ? 'Fixa' : 'Variável' }), (0, jsx_runtime_1.jsx)("td", { children: (0, api_1.money)(Number(item.amount)) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: `status ${item.status}`, children: item.status === 'paid' ? 'Paga' : 'Pendente' }) }), (0, jsx_runtime_1.jsx)("td", { className: "expense-action-cell", onClick: (event) => event.stopPropagation(), children: item.status !== 'paid'
                                                ? (0, jsx_runtime_1.jsx)("button", { type: "button", className: "table-action-button", onClick: () => markPaid(item), children: "Pagar" })
                                                : (0, jsx_runtime_1.jsx)("span", { className: "table-action-placeholder", "aria-label": "Despesa j\u00E1 paga", children: "\u2014" }) }), (0, jsx_runtime_1.jsxs)("td", { className: "expense-action-cell", onClick: (event) => event.stopPropagation(), children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "table-action-button", onClick: () => openEdit(item), children: "Editar" }), item.recurrence_id && (0, jsx_runtime_1.jsx)("button", { type: "button", className: "table-action-button recurrence-stop-action", onClick: () => stopRecurrence(item), children: "Parar" })] }), (0, jsx_runtime_1.jsx)("td", { className: "expense-action-cell", onClick: (event) => event.stopPropagation(), children: (0, jsx_runtime_1.jsxs)("label", { className: "table-action-button attachment-button", title: item.attachment_path ? 'Substituir comprovante' : 'Anexar comprovante', children: ["Anexar", (0, jsx_runtime_1.jsx)("input", { type: "file", accept: "image/*,.pdf", onChange: (event) => uploadAttachment(item.id, event.target.files?.[0]) })] }) }), (0, jsx_runtime_1.jsx)("td", { className: "expense-action-cell", onClick: (event) => event.stopPropagation(), children: (0, jsx_runtime_1.jsx)("button", { type: "button", className: "table-action-button", onClick: () => remove(item.id), children: "Excluir" }) })] }, item.id)) })] }), filteredItems.length === 0 && !loadingItems && (0, jsx_runtime_1.jsx)(EmptyState_1.default, { text: items.length ? "Nenhuma despesa corresponde aos filtros." : "Nenhuma despesa neste mês." })] })] });
}

},
"src/pages/ImportPage.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ImportPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const PageHeader_1 = __importDefault(require("src/components/PageHeader.tsx"));
const api_1 = require("src/services/api.ts");
const toast_1 = require("src/services/toast.ts");
function numberFromText(value) {
    const clean = value.replace(/R\$/gi, '').replace(/\s/g, '');
    if (clean.includes(',') && clean.includes('.'))
        return Number(clean.replace(/\./g, '').replace(',', '.'));
    if (clean.includes(','))
        return Number(clean.replace(',', '.'));
    return Number(clean);
}
function normalizeDate(value) {
    const raw = value.trim().replace(/['"]/g, '');
    const iso = raw.match(/^(\d{4})[-/]?(\d{2})[-/]?(\d{2})/);
    if (iso)
        return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const br = raw.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})/);
    if (br)
        return `${br[3]}-${br[2]}-${br[1]}`;
    return new Date().toISOString().slice(0, 10);
}
function stableId(value) { let hash = 2166136261; for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
} return `stmt-${(hash >>> 0).toString(16)}`; }
function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2)
        return [];
    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(x => x.replace(/["']/g, '').trim().toLowerCase());
    const find = (...keys) => headers.findIndex(h => keys.some(k => h.includes(k)));
    const dateIndex = Math.max(0, find('data', 'date'));
    const descIndex = Math.max(1, find('descr', 'hist', 'memo', 'lançamento', 'lancamento', 'name'));
    let amountIndex = find('valor', 'amount', 'trnamt');
    if (amountIndex < 0)
        amountIndex = headers.length - 1;
    return lines.slice(1).map((line, index) => { const cols = line.split(separator).map(x => x.replace(/^"|"$/g, '').trim()); const amount = numberFromText(cols[amountIndex] || '0'); const date = normalizeDate(cols[dateIndex] || ''); const description = cols[descIndex] || `Movimentação ${index + 1}`; return { id: stableId(`${date}|${description}|${amount}`), date, description, amount: Math.abs(amount), selected: true, kind: amount < 0 ? 'expense' : 'income' }; }).filter(x => Number.isFinite(x.amount) && x.amount !== 0);
}
function tag(block, name) { const m = block.match(new RegExp(`<${name}>([^<\\r\\n]+)`, 'i')); return m?.[1]?.trim() || ''; }
function parseOfx(text) { return text.split(/<STMTTRN>/i).slice(1).map((block, index) => { const raw = numberFromText(tag(block, 'TRNAMT')); const date = normalizeDate(tag(block, 'DTPOSTED')); const description = tag(block, 'MEMO') || tag(block, 'NAME') || `Movimentação ${index + 1}`; const fitid = tag(block, 'FITID') || stableId(`${date}|${description}|${raw}`); return { id: `stmt-${fitid}`, date, description, amount: Math.abs(raw), selected: true, kind: raw < 0 ? 'expense' : 'income' }; }).filter(x => Number.isFinite(x.amount) && x.amount !== 0); }
function ImportPage() {
    const [rows, setRows] = (0, react_1.useState)([]);
    const [accounts, setAccounts] = (0, react_1.useState)([]);
    const [cards, setCards] = (0, react_1.useState)([]);
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [rules, setRules] = (0, react_1.useState)([]);
    const [accountId, setAccountId] = (0, react_1.useState)('');
    const [cardId, setCardId] = (0, react_1.useState)('');
    const [importing, setImporting] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    async function load() { const [a, c, k, r] = await Promise.all([(0, api_1.api)('/accounts'), (0, api_1.api)('/cards'), (0, api_1.api)('/categories'), (0, api_1.api)('/import-rules')]); setAccounts(a); setCards(c); setCategories(k); setRules(r); }
    (0, react_1.useEffect)(() => { void load(); }, []);
    const categoryName = (0, react_1.useMemo)(() => new Map(categories.map(x => [x.id, x.name])), [categories]);
    async function chooseFile(event) { const file = event.target.files?.[0]; if (!file)
        return; try {
        const text = await file.text();
        let parsed = file.name.toLowerCase().endsWith('.ofx') || /<OFX/i.test(text) ? parseOfx(text) : parseCsv(text);
        parsed = parsed.map(row => { const rule = rules.find(r => r.kind === row.kind && row.description.toLowerCase().includes(r.pattern.toLowerCase())); return { ...row, categoryId: rule?.category_id }; });
        setRows(parsed);
        setError(parsed.length ? '' : 'Nenhuma movimentação reconhecida no arquivo.');
    }
    catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível ler o arquivo.');
    }
    finally {
        event.target.value = '';
    } }
    async function importRows() { const selected = rows.filter(x => x.selected); if (!selected.length)
        return; setImporting(true); let imported = 0, skipped = 0; try {
        for (const row of selected) {
            try {
                if (row.kind === 'expense') {
                    const rule = rules.find(r => r.kind === 'expense' && row.description.toLowerCase().includes(r.pattern.toLowerCase()));
                    await (0, api_1.api)('/expenses', { method: 'POST', ...(0, api_1.jsonBody)({ description: row.description, amount: row.amount, purchase_date: row.date, due_date: row.date, category_id: row.categoryId ?? rule?.category_id ?? null, expense_type: 'variable', payment_method: cardId ? 'credit_card' : rule?.payment_method || 'transfer', merchant: row.description, notes: 'Importado de extrato', status: 'paid', paid_date: cardId ? null : row.date, account_id: accountId ? Number(accountId) : null, card_id: cardId ? Number(cardId) : null, installments: 1, auto_card_due: true, external_id: row.id }) });
                }
                else {
                    const rule = rules.find(r => r.kind === 'income' && row.description.toLowerCase().includes(r.pattern.toLowerCase()));
                    await (0, api_1.api)('/incomes', { method: 'POST', ...(0, api_1.jsonBody)({ description: row.description, amount_expected: row.amount, amount_received: row.amount, expected_date: row.date, received_date: row.date, status: 'received', account_id: accountId ? Number(accountId) : null, category_id: row.categoryId ?? rule?.category_id ?? null, notes: 'Importado de extrato', external_id: row.id }) });
                }
                imported++;
            }
            catch {
                skipped++;
            }
        }
        setRows([]);
        toast_1.toast.success('Importação concluída', `${imported} movimentação(ões) importada(s)${skipped ? ` e ${skipped} ignorada(s)/duplicada(s)` : ''}.`);
    }
    finally {
        setImporting(false);
    } }
    async function addRule(event) { event.preventDefault(); const form = new FormData(event.currentTarget); await (0, api_1.api)('/import-rules', { method: 'POST', ...(0, api_1.jsonBody)({ pattern: form.get('pattern'), kind: form.get('kind'), category_id: form.get('category_id') ? Number(form.get('category_id')) : null, payment_method: form.get('payment_method') || 'pix' }) }); event.currentTarget.reset(); await load(); toast_1.toast.success('Regra salva', 'Próximas importações usarão essa classificação automaticamente.'); }
    async function removeRule(id) { await (0, api_1.api)(`/import-rules/${id}`, { method: 'DELETE' }); await load(); }
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageHeader_1.default, { title: "Importar extrato", subtitle: "CSV e OFX com reconhecimento de despesas, rendas e regras autom\u00E1ticas", actions: (0, jsx_runtime_1.jsxs)("label", { className: "primary-button compact file-button", children: ["Selecionar CSV/OFX", (0, jsx_runtime_1.jsx)("input", { type: "file", accept: ".csv,.ofx,text/csv,application/x-ofx", onChange: chooseFile })] }) }), error && (0, jsx_runtime_1.jsx)("div", { className: "form-error", children: error }), (0, jsx_runtime_1.jsxs)("section", { className: "panel statement-settings", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Destino da importa\u00E7\u00E3o" }), (0, jsx_runtime_1.jsxs)("div", { className: "inline-finance-form", children: [(0, jsx_runtime_1.jsxs)("select", { value: accountId, onChange: e => setAccountId(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Sem conta vinculada" }), accounts.map(x => (0, jsx_runtime_1.jsx)("option", { value: x.id, children: x.name }, x.id))] }), (0, jsx_runtime_1.jsxs)("select", { value: cardId, onChange: e => setCardId(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "N\u00E3o \u00E9 fatura de cart\u00E3o" }), cards.map(x => (0, jsx_runtime_1.jsx)("option", { value: x.id, children: x.name }, x.id))] }), rows.length > 0 && (0, jsx_runtime_1.jsx)("button", { className: "primary-button", disabled: importing, onClick: importRows, children: importing ? 'Importando...' : `Importar ${rows.filter(x => x.selected).length} selecionada(s)` })] }), (0, jsx_runtime_1.jsx)("small", { children: "Se um cart\u00E3o for selecionado, o Smart Finance calcula automaticamente a fatura pelo fechamento e vencimento do cart\u00E3o." })] }), rows.length > 0 && (0, jsx_runtime_1.jsxs)("section", { className: "panel", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Pr\u00E9-visualiza\u00E7\u00E3o" }), (0, jsx_runtime_1.jsx)("div", { className: "statement-list", children: rows.map((row, index) => (0, jsx_runtime_1.jsxs)("label", { children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: row.selected, onChange: e => setRows(current => current.map((x, i) => i === index ? { ...x, selected: e.target.checked } : x)) }), (0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsx)("strong", { children: row.description }), (0, jsx_runtime_1.jsxs)("small", { children: [row.date.split('-').reverse().join('/'), " \u2022 ", row.kind === 'expense' ? 'Despesa' : 'Renda', " ", row.categoryId ? `• ${categoryName.get(row.categoryId) || ''}` : ''] })] }), (0, jsx_runtime_1.jsx)("b", { className: row.kind === 'expense' ? 'negative-text' : 'positive-text', children: (0, api_1.money)(row.amount) })] }, `${row.id}-${index}`)) })] }), (0, jsx_runtime_1.jsxs)("section", { className: "panel", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Regras autom\u00E1ticas" }), (0, jsx_runtime_1.jsx)("p", { children: "Exemplo: texto \u201CPOSTO\u201D \u2192 categoria Combust\u00EDvel. A regra ser\u00E1 aplicada nas pr\u00F3ximas importa\u00E7\u00F5es." }), (0, jsx_runtime_1.jsxs)("form", { className: "import-rule-form", onSubmit: addRule, children: [(0, jsx_runtime_1.jsx)("input", { name: "pattern", required: true, placeholder: "Texto contido na descri\u00E7\u00E3o" }), (0, jsx_runtime_1.jsxs)("select", { name: "kind", children: [(0, jsx_runtime_1.jsx)("option", { value: "expense", children: "Despesa" }), (0, jsx_runtime_1.jsx)("option", { value: "income", children: "Renda" })] }), (0, jsx_runtime_1.jsxs)("select", { name: "category_id", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Sem categoria" }), categories.filter(x => x.is_active).map(x => (0, jsx_runtime_1.jsx)("option", { value: x.id, children: x.name }, x.id))] }), (0, jsx_runtime_1.jsxs)("select", { name: "payment_method", children: [(0, jsx_runtime_1.jsx)("option", { value: "pix", children: "Pix" }), (0, jsx_runtime_1.jsx)("option", { value: "debit", children: "D\u00E9bito" }), (0, jsx_runtime_1.jsx)("option", { value: "transfer", children: "Transfer\u00EAncia" }), (0, jsx_runtime_1.jsx)("option", { value: "boleto", children: "Boleto" })] }), (0, jsx_runtime_1.jsx)("button", { className: "secondary-button", children: "Adicionar regra" })] }), (0, jsx_runtime_1.jsx)("div", { className: "rule-list", children: rules.map(rule => (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("span", { children: [(0, jsx_runtime_1.jsxs)("strong", { children: ["Cont\u00E9m \u201C", rule.pattern, "\u201D"] }), (0, jsx_runtime_1.jsxs)("small", { children: [rule.kind === 'expense' ? 'Despesa' : 'Renda', " \u2022 ", rule.category_id ? categoryName.get(rule.category_id) || 'Categoria' : 'Sem categoria'] })] }), (0, jsx_runtime_1.jsx)("button", { className: "danger-text", onClick: () => removeRule(rule.id), children: "Excluir" })] }, rule.id)) })] })] });
}

},
"src/pages/IncomesPage.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = IncomesPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const EmptyState_1 = __importDefault(require("src/components/EmptyState.tsx"));
const ModalCard_1 = __importDefault(require("src/components/ModalCard.tsx"));
const PageHeader_1 = __importDefault(require("src/components/PageHeader.tsx"));
const MoneyInput_1 = __importDefault(require("src/components/MoneyInput.tsx"));
const api_1 = require("src/services/api.ts");
const navigation_1 = require("src/services/navigation.ts");
const confirm_1 = require("src/services/confirm.ts");
const toast_1 = require("src/services/toast.ts");
function payloadFromIncome(item, changes = {}) {
    const value = { ...item, ...changes };
    return {
        description: value.description, amount_expected: Number(value.amount_expected), amount_received: Number(value.amount_received || 0),
        expected_date: value.expected_date, received_date: value.status === 'received' ? value.received_date || (0, api_1.today)() : null,
        status: value.status, account_id: value.account_id ?? null, category_id: value.category_id ?? null, notes: value.notes || '', external_id: value.external_id || null,
    };
}
function IncomesPage() {
    const route = (0, navigation_1.readNavigationTarget)('incomes');
    const targetId = route.itemId;
    const [month, setMonth] = (0, react_1.useState)(route.month || (0, api_1.currentMonth)());
    const [items, setItems] = (0, react_1.useState)([]);
    const [accounts, setAccounts] = (0, react_1.useState)([]);
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [editing, setEditing] = (0, react_1.useState)(null);
    const [recurring, setRecurring] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    const [filterText, setFilterText] = (0, react_1.useState)('');
    const [filterStatus, setFilterStatus] = (0, react_1.useState)('all');
    const [filterCategory, setFilterCategory] = (0, react_1.useState)('all');
    const load = () => Promise.all([(0, api_1.api)(`/incomes?month=${month}`), (0, api_1.api)('/accounts'), (0, api_1.api)('/categories?kind=income')])
        .then(([incomeItems, accountItems, categoryItems]) => { setItems(incomeItems); setAccounts(accountItems); setCategories(categoryItems); setError(''); })
        .catch((err) => setError(err.message));
    (0, react_1.useEffect)(() => { void load(); }, [month]);
    (0, react_1.useEffect)(() => { if (targetId && items.some((item) => item.id === targetId))
        (0, navigation_1.scrollToTarget)(`[data-income-id="${targetId}"]`); }, [items, targetId]);
    function openNew() { setEditing(null); setRecurring(false); setError(''); setShowForm(true); }
    function openEdit(item) { setEditing(item); setRecurring(Boolean(item.recurrence_id)); setError(''); setShowForm(true); window.requestAnimationFrame(() => document.getElementById('income-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }
    function closeForm() { setShowForm(false); setEditing(null); setRecurring(false); }
    async function stopRecurrence(item) {
        if (!item.recurrence_id)
            return;
        const confirmed = await (0, confirm_1.confirmAction)({ title: 'Parar renda recorrente?', message: 'Os próximos lançamentos pendentes desta renda deixarão de ser gerados.', detail: 'O mês atual e rendas já recebidas são preservados.', confirmLabel: 'Parar recorrência', tone: 'warning' });
        if (!confirmed)
            return;
        try {
            const result = await (0, api_1.api)(`/recurring-incomes/${item.recurrence_id}/stop?from_month=${month}&remove_future=true`, { method: 'POST' });
            toast_1.toast.success('Recorrência desativada', `${result.removed || 0} lançamento(s) futuro(s) pendente(s) foram removidos.`);
            if (editing?.id === item.id) {
                setRecurring(false);
                setEditing({ ...item, recurrence_id: undefined });
            }
            await load();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao parar recorrência';
            setError(message);
            toast_1.toast.error('Não foi possível parar a recorrência', message);
        }
    }
    async function submit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const amount = Number(form.get('amount'));
        const status = editing?.status || 'pending';
        const expectedDate = String(form.get('expected_date'));
        const payload = {
            description: form.get('description'), amount_expected: amount, amount_received: status === 'received' ? amount : 0,
            expected_date: expectedDate, received_date: status === 'received' ? editing?.received_date || (0, api_1.today)() : null,
            status, account_id: form.get('account_id') ? Number(form.get('account_id')) : null,
            category_id: form.get('category_id') ? Number(form.get('category_id')) : null, notes: form.get('notes') || '',
            external_id: editing?.external_id || null,
        };
        try {
            setError('');
            if (!editing && recurring) {
                const result = await (0, api_1.api)('/recurring-incomes', { method: 'POST', ...(0, api_1.jsonBody)({
                        description: payload.description, amount, expected_day: Number(expectedDate.slice(8, 10)), category_id: payload.category_id,
                        account_id: payload.account_id, notes: payload.notes, start_month: expectedDate.slice(0, 7), end_month: form.get('end_month') || null,
                        months_to_generate: Number(form.get('months_to_generate') || 24), active: true,
                    }) });
                closeForm();
                await load();
                toast_1.toast.success('Renda recorrente criada', `${result.generated || 0} lançamento(s) mensal(is) foram gerados.`);
                return;
            }
            await (0, api_1.api)(editing ? `/incomes/${editing.id}` : '/incomes', { method: editing ? 'PATCH' : 'POST', ...(0, api_1.jsonBody)(payload) });
            if (editing?.recurrence_id && !recurring) {
                await (0, api_1.api)(`/recurring-incomes/${editing.recurrence_id}/stop?from_month=${month}&remove_future=true`, { method: 'POST' });
                toast_1.toast.success('Recorrência desativada', 'Os próximos lançamentos pendentes foram removidos.');
            }
            const action = editing ? 'Renda atualizada' : 'Renda salva';
            closeForm();
            await load();
            toast_1.toast.success(action, `${String(payload.description)} foi ${editing ? 'atualizada' : 'adicionada'} com sucesso.`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao salvar';
            setError(message);
            toast_1.toast.error('Não foi possível salvar a renda', message);
        }
    }
    async function markReceived(item) {
        try {
            setError('');
            await (0, api_1.api)(`/incomes/${item.id}`, { method: 'PATCH', ...(0, api_1.jsonBody)(payloadFromIncome(item, { amount_received: item.amount_expected, status: 'received', received_date: (0, api_1.today)() })) });
            await load();
            toast_1.toast.success('Recebimento registrado', `${item.description} foi marcada como recebida.`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao registrar recebimento';
            setError(message);
            toast_1.toast.error('Recebimento não registrado', message);
        }
    }
    async function remove(id) {
        const item = items.find((income) => income.id === id);
        const confirmed = await (0, confirm_1.confirmAction)({ title: 'Excluir renda?', message: item ? `${item.description} será removida do mês.` : 'Esta renda será removida do mês.', detail: item?.recurrence_id ? 'Isso exclui apenas esta ocorrência. Para remover os próximos meses, use “Parar recorrência”.' : 'Esta ação não pode ser desfeita.', confirmLabel: 'Excluir renda', tone: 'danger' });
        if (!confirmed)
            return;
        try {
            await (0, api_1.api)(`/incomes/${id}`, { method: 'DELETE' });
            await load();
            toast_1.toast.success('Renda excluída', 'O lançamento foi removido.');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao excluir';
            setError(message);
            toast_1.toast.error('Não foi possível excluir', message);
        }
    }
    const normalizedFilter = filterText.trim().toLocaleLowerCase('pt-BR');
    const filteredItems = items.filter((item) => {
        if (normalizedFilter && !`${item.description} ${item.notes || ''}`.toLocaleLowerCase('pt-BR').includes(normalizedFilter))
            return false;
        if (filterStatus !== 'all' && item.status !== filterStatus)
            return false;
        if (filterCategory !== 'all' && String(item.category_id || '') !== filterCategory)
            return false;
        return true;
    });
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageHeader_1.default, { title: "Rendas", subtitle: "Sal\u00E1rios, extras e recebimentos recorrentes", actions: (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("input", { className: "month-input", type: "month", value: month, onChange: (event) => setMonth(event.target.value) }), (0, jsx_runtime_1.jsx)("button", { className: "primary-button compact", onClick: openNew, children: "+ Nova renda" })] }) }), showForm && (0, jsx_runtime_1.jsx)(ModalCard_1.default, { onClose: closeForm, label: editing ? `Editar renda ${editing.description}` : 'Nova renda', wide: true, children: (0, jsx_runtime_1.jsxs)("form", { id: "income-form", className: "panel form-grid modal-form", onSubmit: submit, children: [(0, jsx_runtime_1.jsx)("h3", { className: "form-title wide", children: editing ? 'Editar salário ou renda' : 'Nova renda' }), !editing && (0, jsx_runtime_1.jsxs)("label", { className: "toggle-line wide", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: recurring, onChange: (e) => setRecurring(e.target.checked) }), " Renda recorrente mensal"] }), editing?.recurrence_id && (0, jsx_runtime_1.jsxs)("div", { className: "recurrence-control wide", children: [(0, jsx_runtime_1.jsxs)("label", { className: "toggle-line", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: recurring, onChange: (e) => setRecurring(e.target.checked) }), " Manter renda recorrente"] }), (0, jsx_runtime_1.jsx)("small", { children: "Desmarque e salve para interromper os pr\u00F3ximos lan\u00E7amentos pendentes." })] }), (0, jsx_runtime_1.jsxs)("label", { className: "wide", children: ["Descri\u00E7\u00E3o", (0, jsx_runtime_1.jsx)("input", { name: "description", required: true, defaultValue: editing?.description || '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Valor", (0, jsx_runtime_1.jsx)(MoneyInput_1.default, { name: "amount", required: true, defaultValue: editing ? Number(editing.amount_expected) : '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Data prevista", (0, jsx_runtime_1.jsx)("input", { name: "expected_date", type: "date", defaultValue: editing?.expected_date || '' || `${month}-01`, required: true })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Categoria", (0, jsx_runtime_1.jsxs)("select", { name: "category_id", defaultValue: editing?.category_id || '', children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Sem categoria" }), categories.map((item) => (0, jsx_runtime_1.jsx)("option", { value: item.id, children: item.name }, item.id))] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Conta de destino", (0, jsx_runtime_1.jsxs)("select", { name: "account_id", defaultValue: editing?.account_id || '', children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "N\u00E3o informada" }), accounts.map((item) => (0, jsx_runtime_1.jsx)("option", { value: item.id, children: item.name }, item.id))] })] }), recurring && !editing && (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("label", { children: ["Gerar por", (0, jsx_runtime_1.jsxs)("select", { name: "months_to_generate", defaultValue: "24", children: [(0, jsx_runtime_1.jsx)("option", { value: "12", children: "12 meses" }), (0, jsx_runtime_1.jsx)("option", { value: "24", children: "24 meses" }), (0, jsx_runtime_1.jsx)("option", { value: "36", children: "36 meses" }), (0, jsx_runtime_1.jsx)("option", { value: "60", children: "60 meses" })] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Final opcional", (0, jsx_runtime_1.jsx)("input", { type: "month", name: "end_month", min: month })] })] }), (0, jsx_runtime_1.jsxs)("label", { className: "wide", children: ["Observa\u00E7\u00F5es", (0, jsx_runtime_1.jsx)("textarea", { name: "notes", rows: 2, defaultValue: editing?.notes || '' })] }), editing?.status === 'received' && (0, jsx_runtime_1.jsxs)("p", { className: "income-received-note wide", children: ["Esta renda j\u00E1 foi recebida em ", editing.received_date || 'data não informada', "."] }), (0, jsx_runtime_1.jsxs)("div", { className: "form-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "primary-button", children: editing ? 'Salvar alterações' : 'Salvar' }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "secondary-button", onClick: closeForm, children: "Cancelar" }), editing?.recurrence_id && (0, jsx_runtime_1.jsx)("button", { type: "button", className: "danger-button", onClick: () => stopRecurrence(editing), children: "Parar recorr\u00EAncia" })] })] }, editing?.id || 'new-income') }), error && (0, jsx_runtime_1.jsx)("div", { className: "form-error", children: error }), (0, jsx_runtime_1.jsxs)("div", { className: "advanced-filters panel", "aria-label": "Filtros avan\u00E7ados de rendas", children: [(0, jsx_runtime_1.jsx)("input", { value: filterText, onChange: (e) => setFilterText(e.target.value), placeholder: "Buscar renda ou observa\u00E7\u00E3o" }), (0, jsx_runtime_1.jsxs)("select", { value: filterStatus, onChange: (e) => setFilterStatus(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "all", children: "Todos os status" }), (0, jsx_runtime_1.jsx)("option", { value: "pending", children: "Pendentes" }), (0, jsx_runtime_1.jsx)("option", { value: "received", children: "Recebidas" })] }), (0, jsx_runtime_1.jsxs)("select", { value: filterCategory, onChange: (e) => setFilterCategory(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "all", children: "Todas as categorias" }), categories.map((item) => (0, jsx_runtime_1.jsx)("option", { value: String(item.id), children: item.name }, item.id))] }), (filterText || filterStatus !== 'all' || filterCategory !== 'all') && (0, jsx_runtime_1.jsx)("button", { type: "button", className: "secondary-button compact", onClick: () => { setFilterText(''); setFilterStatus('all'); setFilterCategory('all'); }, children: "Limpar filtros" })] }), (0, jsx_runtime_1.jsxs)("section", { className: "table-panel incomes-table", children: [(0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Descri\u00E7\u00E3o" }), (0, jsx_runtime_1.jsx)("th", { children: "Data prevista" }), (0, jsx_runtime_1.jsx)("th", { children: "Valor" }), (0, jsx_runtime_1.jsx)("th", { children: "Status" }), (0, jsx_runtime_1.jsx)("th", { className: "income-actions-heading", children: "A\u00E7\u00F5es" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: filteredItems.map((item) => (0, jsx_runtime_1.jsxs)("tr", { "data-income-id": item.id, tabIndex: -1, className: targetId === item.id ? 'target-row' : '', children: [(0, jsx_runtime_1.jsxs)("td", { children: [(0, jsx_runtime_1.jsx)("strong", { children: item.description }), item.recurrence_id && (0, jsx_runtime_1.jsx)("small", { className: "recurrence-badge", children: "\u21BB Recorrente" })] }), (0, jsx_runtime_1.jsx)("td", { children: item.expected_date }), (0, jsx_runtime_1.jsx)("td", { children: (0, api_1.money)(Number(item.amount_expected)) }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { className: `status ${item.status}`, children: item.status === 'received' ? 'Recebida' : 'Pendente' }) }), (0, jsx_runtime_1.jsx)("td", { className: "income-actions-cell", children: (0, jsx_runtime_1.jsxs)("div", { className: "row-actions income-row-actions", children: [item.status !== 'received' && (0, jsx_runtime_1.jsx)("button", { onClick: () => markReceived(item), children: "Receber" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => openEdit(item), children: "Editar" }), item.recurrence_id && (0, jsx_runtime_1.jsx)("button", { onClick: () => stopRecurrence(item), children: "Parar recorr\u00EAncia" }), (0, jsx_runtime_1.jsx)("button", { className: "danger-text", onClick: () => remove(item.id), children: "Excluir" })] }) })] }, item.id)) })] }), filteredItems.length === 0 && (0, jsx_runtime_1.jsx)(EmptyState_1.default, { text: items.length ? "Nenhuma renda corresponde aos filtros." : "Nenhuma renda neste mês." })] })] });
}

},
"src/pages/LoansPage.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoansPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const EmptyState_1 = __importDefault(require("src/components/EmptyState.tsx"));
const ModalCard_1 = __importDefault(require("src/components/ModalCard.tsx"));
const PageHeader_1 = __importDefault(require("src/components/PageHeader.tsx"));
const MoneyInput_1 = __importDefault(require("src/components/MoneyInput.tsx"));
const api_1 = require("src/services/api.ts");
const navigation_1 = require("src/services/navigation.ts");
const confirm_1 = require("src/services/confirm.ts");
const toast_1 = require("src/services/toast.ts");
function LoansPage() {
    const route = (0, navigation_1.readNavigationTarget)('loans');
    const targetId = route.itemId;
    const [items, setItems] = (0, react_1.useState)([]);
    const [accounts, setAccounts] = (0, react_1.useState)([]);
    const [showForm, setShowForm] = (0, react_1.useState)(false);
    const [editingLoan, setEditingLoan] = (0, react_1.useState)(null);
    const [editingInstallment, setEditingInstallment] = (0, react_1.useState)(null);
    const installmentFormRef = (0, react_1.useRef)(null);
    const [error, setError] = (0, react_1.useState)('');
    const load = () => Promise.all([(0, api_1.api)('/loans'), (0, api_1.api)('/accounts')])
        .then(([loans, accountItems]) => { setItems(loans); setAccounts(accountItems); })
        .catch((err) => setError(err.message));
    (0, react_1.useEffect)(() => { void load(); }, []);
    (0, react_1.useEffect)(() => {
        if (!editingInstallment)
            return;
        const onPointerDown = (event) => {
            if (!installmentFormRef.current?.contains(event.target))
                setEditingInstallment(null);
        };
        const onKeyDown = (event) => { if (event.key === 'Escape')
            setEditingInstallment(null); };
        document.addEventListener('mousedown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('mousedown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [editingInstallment]);
    (0, react_1.useEffect)(() => {
        if (targetId && items.some((loan) => loan.installments.some((item) => item.id === targetId))) {
            (0, navigation_1.scrollToTarget)(`[data-installment-id="${targetId}"]`);
        }
    }, [items, targetId]);
    function openNew() {
        setEditingLoan(null);
        setEditingInstallment(null);
        setError('');
        setShowForm(true);
    }
    function openEditLoan(loan) {
        setEditingLoan(loan);
        setEditingInstallment(null);
        setError('');
        setShowForm(true);
        window.requestAnimationFrame(() => document.getElementById('loan-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
    function closeLoanForm() {
        setShowForm(false);
        setEditingLoan(null);
    }
    async function submit(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const payload = {
            creditor: form.get('creditor'),
            principal_amount: Number(form.get('principal_amount')),
            total_amount: Number(form.get('total_amount')),
            interest_rate: Number(form.get('interest_rate') || 0),
            installment_count: Number(form.get('installment_count')),
            installment_amount: Number(form.get('installment_amount')),
            first_due_date: form.get('first_due_date'),
            notes: form.get('notes') || '',
        };
        try {
            setError('');
            if (editingLoan) {
                await (0, api_1.api)(`/loans/${editingLoan.id}`, { method: 'PATCH', ...(0, api_1.jsonBody)(payload) });
            }
            else {
                await (0, api_1.api)('/loans', { method: 'POST', ...(0, api_1.jsonBody)(payload) });
            }
            const wasEditing = Boolean(editingLoan);
            closeLoanForm();
            await load();
            toast_1.toast.success(wasEditing ? 'Empréstimo atualizado' : 'Empréstimo salvo', `${String(payload.creditor)} foi ${wasEditing ? 'atualizado' : 'adicionado'}.`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao salvar empréstimo';
            setError(message);
            toast_1.toast.error('Não foi possível salvar o empréstimo', message);
        }
    }
    async function saveInstallment(event) {
        event.preventDefault();
        if (!editingInstallment)
            return;
        const form = new FormData(event.currentTarget);
        const status = String(form.get('status'));
        try {
            setError('');
            await (0, api_1.api)(`/loan-installments/${editingInstallment.id}`, { method: 'PATCH', ...(0, api_1.jsonBody)({
                    due_date: form.get('due_date'),
                    amount: Number(form.get('amount')),
                    status,
                    paid_date: status === 'paid' ? form.get('paid_date') || (0, api_1.today)() : null,
                    account_id: form.get('account_id') ? Number(form.get('account_id')) : null,
                }) });
            const number = editingInstallment.installment_number;
            setEditingInstallment(null);
            await load();
            toast_1.toast.success('Parcela atualizada', `A parcela ${number} foi atualizada.`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao editar parcela';
            setError(message);
            toast_1.toast.error('Não foi possível editar a parcela', message);
        }
    }
    async function pay(id, accountId) {
        try {
            setError('');
            await (0, api_1.api)(`/loan-installments/${id}/pay${accountId ? `?account_id=${accountId}` : ''}`, { method: 'POST' });
            await load();
            toast_1.toast.success('Parcela paga', 'O pagamento foi registrado com sucesso.');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao registrar pagamento';
            setError(message);
            toast_1.toast.error('Pagamento não registrado', message);
        }
    }
    async function remove(id) {
        const loan = items.find((item) => item.id === id);
        const confirmed = await (0, confirm_1.confirmAction)({
            title: `Excluir ${loan?.creditor || 'este empréstimo'}?`,
            message: 'O empréstimo completo e todas as parcelas serão removidos.',
            detail: 'Parcelas já pagas também serão excluídas do histórico. Esta ação não pode ser desfeita.',
            confirmLabel: 'Excluir empréstimo',
            tone: 'danger',
        });
        if (!confirmed)
            return;
        try {
            setError('');
            await (0, api_1.api)(`/loans/${id}`, { method: 'DELETE' });
            await load();
            toast_1.toast.success('Empréstimo excluído', 'O empréstimo e suas parcelas foram removidos.');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao excluir';
            setError(message);
            toast_1.toast.error('Não foi possível excluir o empréstimo', message);
        }
    }
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageHeader_1.default, { title: "Empr\u00E9stimos e d\u00EDvidas", subtitle: "Acompanhe parcelas, juros e saldo pendente", actions: (0, jsx_runtime_1.jsx)("button", { className: "primary-button compact", onClick: openNew, children: "+ Novo empr\u00E9stimo" }) }), showForm && (0, jsx_runtime_1.jsx)(ModalCard_1.default, { onClose: closeLoanForm, label: editingLoan ? `Editar empréstimo ${editingLoan.creditor}` : 'Novo empréstimo', wide: true, children: (0, jsx_runtime_1.jsxs)("form", { id: "loan-form", className: "panel form-grid modal-form", onSubmit: submit, children: [(0, jsx_runtime_1.jsx)("h3", { className: "form-title wide", children: editingLoan ? `Editar empréstimo: ${editingLoan.creditor}` : 'Novo empréstimo' }), (0, jsx_runtime_1.jsxs)("label", { children: ["Institui\u00E7\u00E3o ou credor", (0, jsx_runtime_1.jsx)("input", { name: "creditor", required: true, defaultValue: editingLoan?.creditor || '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Valor recebido", (0, jsx_runtime_1.jsx)(MoneyInput_1.default, { name: "principal_amount", required: true, defaultValue: editingLoan ? Number(editingLoan.principal_amount) : '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Valor total", (0, jsx_runtime_1.jsx)(MoneyInput_1.default, { name: "total_amount", required: true, defaultValue: editingLoan ? Number(editingLoan.total_amount) : '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Juros (%)", (0, jsx_runtime_1.jsx)("input", { name: "interest_rate", type: "number", step: "0.001", defaultValue: editingLoan ? Number(editingLoan.interest_rate) : 0 })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Quantidade de parcelas", (0, jsx_runtime_1.jsx)("input", { name: "installment_count", type: "number", min: "1", max: "600", required: true, defaultValue: editingLoan?.installment_count || '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Valor da parcela", (0, jsx_runtime_1.jsx)(MoneyInput_1.default, { name: "installment_amount", required: true, defaultValue: editingLoan ? Number(editingLoan.installment_amount) : '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Primeiro vencimento", (0, jsx_runtime_1.jsx)("input", { name: "first_due_date", type: "date", defaultValue: editingLoan?.first_due_date || (0, api_1.today)(), required: true })] }), (0, jsx_runtime_1.jsxs)("label", { className: "wide", children: ["Observa\u00E7\u00F5es", (0, jsx_runtime_1.jsx)("textarea", { name: "notes", rows: 2, defaultValue: editingLoan?.notes || '' })] }), editingLoan && (0, jsx_runtime_1.jsx)("p", { className: "form-help wide", children: "Parcelas j\u00E1 pagas ser\u00E3o preservadas. Valor e vencimento ser\u00E3o recalculados apenas nas parcelas pendentes." }), (0, jsx_runtime_1.jsxs)("div", { className: "form-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "primary-button", children: editingLoan ? 'Salvar alterações' : 'Salvar' }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "secondary-button", onClick: closeLoanForm, children: "Cancelar" })] })] }, editingLoan?.id || 'new-loan') }), error && (0, jsx_runtime_1.jsx)("div", { className: "form-error", children: error }), (0, jsx_runtime_1.jsx)("section", { className: "loan-list", children: items.length === 0 ? (0, jsx_runtime_1.jsx)(EmptyState_1.default, { text: "Nenhum empr\u00E9stimo cadastrado." }) : items.map((loan) => {
                    const paid = loan.installments.filter((item) => item.status === 'paid').length;
                    const remaining = loan.installments.filter((item) => item.status !== 'paid').reduce((sum, item) => sum + Number(item.amount), 0);
                    return (0, jsx_runtime_1.jsxs)("article", { className: "panel loan-card", children: [(0, jsx_runtime_1.jsxs)("div", { className: "loan-header", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: loan.creditor }), (0, jsx_runtime_1.jsxs)("p", { children: [paid, "/", loan.installment_count, " parcelas pagas"] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(remaining) }), (0, jsx_runtime_1.jsx)("small", { children: "Saldo estimado" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "loan-header-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "secondary-button compact", onClick: () => openEditLoan(loan), children: "Editar" }), (0, jsx_runtime_1.jsx)("button", { className: "danger-button", onClick: () => remove(loan.id), children: "Excluir" })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "progress", children: (0, jsx_runtime_1.jsx)("span", { style: { width: `${Math.round((paid / loan.installment_count) * 100)}%` } }) }), (0, jsx_runtime_1.jsx)("div", { className: "installments", children: loan.installments.map((item) => editingInstallment?.id === item.id ? (0, jsx_runtime_1.jsx)("div", { "data-installment-id": item.id, className: "installment-editing target-row", children: (0, jsx_runtime_1.jsxs)("form", { ref: installmentFormRef, onSubmit: saveInstallment, className: "installment-edit-form", children: [(0, jsx_runtime_1.jsxs)("label", { children: ["Vencimento", (0, jsx_runtime_1.jsx)("input", { name: "due_date", type: "date", required: true, defaultValue: item.due_date })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Valor", (0, jsx_runtime_1.jsx)(MoneyInput_1.default, { name: "amount", required: true, defaultValue: Number(item.amount) })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Situa\u00E7\u00E3o", (0, jsx_runtime_1.jsxs)("select", { name: "status", defaultValue: item.status, children: [(0, jsx_runtime_1.jsx)("option", { value: "pending", children: "Pendente" }), (0, jsx_runtime_1.jsx)("option", { value: "paid", children: "Paga" })] })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Data do pagamento", (0, jsx_runtime_1.jsx)("input", { name: "paid_date", type: "date", defaultValue: item.paid_date || '' })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Conta", (0, jsx_runtime_1.jsxs)("select", { name: "account_id", defaultValue: item.account_id || '', children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "N\u00E3o informada" }), accounts.map((account) => (0, jsx_runtime_1.jsx)("option", { value: account.id, children: account.name }, account.id))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "installment-edit-actions", children: [(0, jsx_runtime_1.jsx)("button", { className: "primary-button compact", children: "Salvar" }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "secondary-button compact", onClick: () => setEditingInstallment(null), children: "Cancelar" })] })] }) }, item.id) : (0, jsx_runtime_1.jsxs)("div", { "data-installment-id": item.id, tabIndex: -1, className: `${item.status === 'paid' ? 'paid-installment' : ''} ${targetId === item.id ? 'target-row' : ''}`, children: [(0, jsx_runtime_1.jsxs)("span", { children: [item.installment_number, "/", loan.installment_count, " \u2022 ", item.due_date] }), (0, jsx_runtime_1.jsx)("b", { children: (0, api_1.money)(Number(item.amount)) }), item.status === 'paid' ? (0, jsx_runtime_1.jsxs)("small", { children: ["Pago ", item.paid_date ? `em ${item.paid_date}` : ''] }) : (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("select", { id: `account-${item.id}`, defaultValue: "", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "Conta..." }), accounts.map((account) => (0, jsx_runtime_1.jsx)("option", { value: account.id, children: account.name }, account.id))] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => pay(item.id, document.getElementById(`account-${item.id}`)?.value || ''), children: "Pagar" })] }), (0, jsx_runtime_1.jsx)("button", { className: "edit-installment-button", onClick: () => setEditingInstallment(item), children: "Editar" })] }, item.id)) })] }, loan.id);
                }) })] });
}

},
"src/pages/PlanningPage.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PlanningPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const PageHeader_1 = __importDefault(require("src/components/PageHeader.tsx"));
const MoneyInput_1 = __importDefault(require("src/components/MoneyInput.tsx"));
const EmptyState_1 = __importDefault(require("src/components/EmptyState.tsx"));
const api_1 = require("src/services/api.ts");
const confirm_1 = require("src/services/confirm.ts");
const toast_1 = require("src/services/toast.ts");
function monthLabel(value) {
    const [year, month] = value.split('-').map(Number);
    return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
}
function PlanningPage() {
    const [month, setMonth] = (0, react_1.useState)((0, api_1.currentMonth)());
    const [horizon, setHorizon] = (0, react_1.useState)(12);
    const [forecast, setForecast] = (0, react_1.useState)([]);
    const [budgets, setBudgets] = (0, react_1.useState)([]);
    const [goals, setGoals] = (0, react_1.useState)([]);
    const [installments, setInstallments] = (0, react_1.useState)([]);
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [error, setError] = (0, react_1.useState)('');
    async function load() {
        try {
            const [forecastRows, budgetRows, goalRows, installmentRows, categoryRows] = await Promise.all([
                (0, api_1.api)(`/planning/forecast?months=${horizon}&start=${month}`),
                (0, api_1.api)(`/budgets?month=${month}`),
                (0, api_1.api)('/goals'),
                (0, api_1.api)('/installments/center'),
                (0, api_1.api)('/categories?kind=expense'),
            ]);
            setForecast(forecastRows);
            setBudgets(budgetRows);
            setGoals(goalRows);
            setInstallments(installmentRows);
            setCategories(categoryRows.filter(x => x.is_active));
            setError('');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Não foi possível carregar o planejamento.');
        }
    }
    (0, react_1.useEffect)(() => { void load(); }, [month, horizon]);
    async function saveBudget(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
            await (0, api_1.api)('/budgets', { method: 'POST', ...(0, api_1.jsonBody)({ month, category_id: Number(form.get('category_id')), limit_amount: Number(form.get('limit_amount')) }) });
            event.currentTarget.reset();
            await load();
            toast_1.toast.success('Orçamento salvo', 'O limite da categoria foi atualizado.');
        }
        catch (err) {
            toast_1.toast.error('Não foi possível salvar o orçamento', err instanceof Error ? err.message : 'Erro ao salvar');
        }
    }
    async function removeBudget(id) { await (0, api_1.api)(`/budgets/${id}`, { method: 'DELETE' }); await load(); }
    async function saveGoal(event) {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        try {
            await (0, api_1.api)('/goals', { method: 'POST', ...(0, api_1.jsonBody)({ name: form.get('name'), target_amount: Number(form.get('target_amount')), current_amount: Number(form.get('current_amount') || 0), target_date: form.get('target_date') || null, status: 'active' }) });
            event.currentTarget.reset();
            await load();
            toast_1.toast.success('Meta criada', 'A meta financeira já está sendo acompanhada.');
        }
        catch (err) {
            toast_1.toast.error('Não foi possível criar a meta', err instanceof Error ? err.message : 'Erro ao salvar');
        }
    }
    async function updateGoal(goal) {
        const value = window.prompt(`Quanto já foi reservado para “${goal.name}”?`, String(goal.current_amount));
        if (value == null)
            return;
        const normalized = Number(value.replace(',', '.'));
        if (!Number.isFinite(normalized) || normalized < 0)
            return toast_1.toast.warning('Valor inválido', 'Informe um número igual ou maior que zero.');
        await (0, api_1.api)(`/goals/${goal.id}`, { method: 'PATCH', ...(0, api_1.jsonBody)({ ...goal, current_amount: normalized, status: normalized >= goal.target_amount ? 'completed' : 'active' }) });
        await load();
    }
    async function removeGoal(goal) {
        if (!(await (0, confirm_1.confirmAction)({ title: `Excluir meta “${goal.name}”?`, message: 'O acompanhamento desta meta será removido.', confirmLabel: 'Excluir meta', tone: 'danger' })))
            return;
        await (0, api_1.api)(`/goals/${goal.id}`, { method: 'DELETE' });
        await load();
    }
    const totals = (0, react_1.useMemo)(() => forecast.reduce((acc, row) => ({ income: acc.income + row.income, expenses: acc.expenses + row.expenses, balance: acc.balance + row.balance }), { income: 0, expenses: 0, balance: 0 }), [forecast]);
    const commitment = totals.income ? totals.expenses / totals.income * 100 : 0;
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageHeader_1.default, { title: "Planejamento", subtitle: "Previs\u00E3o, or\u00E7amentos, metas e parcelas futuras", actions: (0, jsx_runtime_1.jsxs)("div", { className: "planning-header-actions", children: [(0, jsx_runtime_1.jsx)("input", { type: "month", className: "month-input", value: month, onChange: e => setMonth(e.target.value) }), (0, jsx_runtime_1.jsxs)("select", { value: horizon, onChange: e => setHorizon(Number(e.target.value)), children: [(0, jsx_runtime_1.jsx)("option", { value: 3, children: "3 meses" }), (0, jsx_runtime_1.jsx)("option", { value: 6, children: "6 meses" }), (0, jsx_runtime_1.jsx)("option", { value: 12, children: "12 meses" })] })] }) }), error && (0, jsx_runtime_1.jsx)("div", { className: "form-error", children: error }), (0, jsx_runtime_1.jsxs)("section", { className: "summary-grid planning-summary", children: [(0, jsx_runtime_1.jsxs)("article", { className: "summary-card", children: [(0, jsx_runtime_1.jsx)("span", { children: "Renda no per\u00EDodo" }), (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(totals.income) }), (0, jsx_runtime_1.jsxs)("small", { children: [horizon, " m\u00EAs(es) projetados"] })] }), (0, jsx_runtime_1.jsxs)("article", { className: "summary-card", children: [(0, jsx_runtime_1.jsx)("span", { children: "Compromissos" }), (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(totals.expenses) }), (0, jsx_runtime_1.jsxs)("small", { children: [commitment.toFixed(0), "% da renda prevista"] })] }), (0, jsx_runtime_1.jsxs)("article", { className: `summary-card ${totals.balance < 0 ? 'negative' : 'positive'}`, children: [(0, jsx_runtime_1.jsx)("span", { children: "Sobra projetada" }), (0, jsx_runtime_1.jsx)("strong", { children: (0, api_1.money)(totals.balance) }), (0, jsx_runtime_1.jsx)("small", { children: "Sem contar novos gastos ainda n\u00E3o cadastrados" })] }), (0, jsx_runtime_1.jsxs)("article", { className: "summary-card", children: [(0, jsx_runtime_1.jsx)("span", { children: "Parcelamentos ativos" }), (0, jsx_runtime_1.jsx)("strong", { children: installments.filter(x => x.pending_installments > 0).length }), (0, jsx_runtime_1.jsxs)("small", { children: [(0, api_1.money)(installments.reduce((sum, x) => sum + x.remaining, 0)), " ainda comprometidos"] })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "panel planning-forecast-panel", children: [(0, jsx_runtime_1.jsx)("div", { className: "panel-title-row", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h3", { children: "Previs\u00E3o m\u00EAs a m\u00EAs" }), (0, jsx_runtime_1.jsx)("p", { children: "Rendas, despesas, cart\u00F5es e parcelas j\u00E1 cadastradas." })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "forecast-grid", children: forecast.map(row => (0, jsx_runtime_1.jsxs)("article", { className: "forecast-card", children: [(0, jsx_runtime_1.jsx)("strong", { children: monthLabel(row.month) }), (0, jsx_runtime_1.jsxs)("span", { children: ["Rendas ", (0, jsx_runtime_1.jsx)("b", { children: (0, api_1.money)(row.income) })] }), (0, jsx_runtime_1.jsxs)("span", { children: ["Despesas ", (0, jsx_runtime_1.jsx)("b", { children: (0, api_1.money)(row.expenses) })] }), (0, jsx_runtime_1.jsxs)("span", { children: ["Cart\u00F5es ", (0, jsx_runtime_1.jsx)("b", { children: (0, api_1.money)(row.card_total) })] }), (0, jsx_runtime_1.jsxs)("span", { children: ["Parcelas ", (0, jsx_runtime_1.jsx)("b", { children: (0, api_1.money)(row.installments_total) })] }), (0, jsx_runtime_1.jsxs)("div", { className: row.balance < 0 ? 'negative-text' : 'positive-text', children: ["Saldo ", (0, api_1.money)(row.balance)] })] }, row.month)) })] }), (0, jsx_runtime_1.jsxs)("section", { className: "planning-two-columns", children: [(0, jsx_runtime_1.jsxs)("article", { className: "panel", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Or\u00E7amento por categoria" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Defina quanto pretende gastar em cada categoria em ", monthLabel(month), "."] }), (0, jsx_runtime_1.jsxs)("form", { className: "inline-finance-form", onSubmit: saveBudget, children: [(0, jsx_runtime_1.jsxs)("select", { name: "category_id", required: true, defaultValue: "", children: [(0, jsx_runtime_1.jsx)("option", { value: "", disabled: true, children: "Categoria" }), categories.map(c => (0, jsx_runtime_1.jsx)("option", { value: c.id, children: c.name }, c.id))] }), (0, jsx_runtime_1.jsx)(MoneyInput_1.default, { name: "limit_amount", required: true, placeholder: "Limite" }), (0, jsx_runtime_1.jsx)("button", { className: "primary-button compact", children: "Salvar" })] }), (0, jsx_runtime_1.jsx)("div", { className: "budget-list", children: budgets.length === 0 ? (0, jsx_runtime_1.jsx)(EmptyState_1.default, { text: "Nenhum or\u00E7amento definido para este m\u00EAs." }) : budgets.map(item => (0, jsx_runtime_1.jsxs)("div", { className: "budget-row", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: item.category_name }), (0, jsx_runtime_1.jsxs)("small", { children: [(0, api_1.money)(item.spent), " de ", (0, api_1.money)(item.limit_amount)] }), (0, jsx_runtime_1.jsx)("div", { className: "budget-track", children: (0, jsx_runtime_1.jsx)("i", { style: { width: `${Math.min(100, item.percent)}%` } }) })] }), (0, jsx_runtime_1.jsxs)("b", { className: item.percent > 100 ? 'negative-text' : '', children: [item.percent.toFixed(0), "%"] }), (0, jsx_runtime_1.jsx)("button", { className: "danger-text", onClick: () => removeBudget(item.id), children: "Remover" })] }, item.id)) })] }), (0, jsx_runtime_1.jsxs)("article", { className: "panel", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Metas financeiras" }), (0, jsx_runtime_1.jsx)("p", { children: "Separe objetivos do saldo dispon\u00EDvel e acompanhe o progresso." }), (0, jsx_runtime_1.jsxs)("form", { className: "goal-form", onSubmit: saveGoal, children: [(0, jsx_runtime_1.jsx)("input", { name: "name", required: true, placeholder: "Ex.: Reserva de emerg\u00EAncia" }), (0, jsx_runtime_1.jsx)(MoneyInput_1.default, { name: "target_amount", required: true, placeholder: "Meta" }), (0, jsx_runtime_1.jsx)(MoneyInput_1.default, { name: "current_amount", placeholder: "J\u00E1 guardado" }), (0, jsx_runtime_1.jsx)("input", { name: "target_date", type: "date" }), (0, jsx_runtime_1.jsx)("button", { className: "primary-button compact", children: "Criar meta" })] }), (0, jsx_runtime_1.jsx)("div", { className: "goal-list", children: goals.length === 0 ? (0, jsx_runtime_1.jsx)(EmptyState_1.default, { text: "Nenhuma meta cadastrada." }) : goals.map(goal => { const pct = goal.target_amount ? Math.min(100, goal.current_amount / goal.target_amount * 100) : 0; return (0, jsx_runtime_1.jsxs)("div", { className: "goal-row", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("strong", { children: goal.name }), (0, jsx_runtime_1.jsxs)("small", { children: [(0, api_1.money)(goal.current_amount), " de ", (0, api_1.money)(goal.target_amount), " ", goal.target_date ? `• até ${goal.target_date.split('-').reverse().join('/')}` : ''] }), (0, jsx_runtime_1.jsx)("div", { className: "budget-track", children: (0, jsx_runtime_1.jsx)("i", { style: { width: `${pct}%` } }) })] }), (0, jsx_runtime_1.jsxs)("b", { children: [pct.toFixed(0), "%"] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => updateGoal(goal), children: "Atualizar" }), (0, jsx_runtime_1.jsx)("button", { className: "danger-text", onClick: () => removeGoal(goal), children: "Excluir" })] }, goal.id); }) })] })] }), (0, jsx_runtime_1.jsxs)("section", { className: "panel installment-center", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Central de parcelamentos" }), (0, jsx_runtime_1.jsx)("p", { children: "Compras parceladas e empr\u00E9stimos em um \u00FAnico lugar." }), installments.length === 0 ? (0, jsx_runtime_1.jsx)(EmptyState_1.default, { text: "Nenhum parcelamento cadastrado." }) : (0, jsx_runtime_1.jsx)("div", { className: "installment-grid", children: installments.map(item => (0, jsx_runtime_1.jsxs)("article", { children: [(0, jsx_runtime_1.jsx)("span", { children: item.kind === 'loan' ? 'Empréstimo' : 'Compra parcelada' }), (0, jsx_runtime_1.jsx)("strong", { children: item.name }), (0, jsx_runtime_1.jsxs)("small", { children: [item.pending_installments, " de ", item.total_installments, " parcela(s) pendentes"] }), (0, jsx_runtime_1.jsxs)("b", { children: [(0, api_1.money)(item.remaining), " restantes"] }), (0, jsx_runtime_1.jsxs)("small", { children: ["\u00DAltimo vencimento: ", item.last_due.split('-').reverse().join('/')] })] }, `${item.kind}-${item.group}`)) })] })] });
}

},
"src/pages/ReportsPage.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ReportsPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const PageHeader_1 = __importDefault(require("src/components/PageHeader.tsx"));
const api_1 = require("src/services/api.ts");
const toast_1 = require("src/services/toast.ts");
function ReportsPage() {
    const [month, setMonth] = (0, react_1.useState)((0, api_1.currentMonth)());
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    async function download() {
        setLoading(true);
        setError('');
        try {
            const blob = await (0, api_1.api)(`/reports/monthly.pdf?month=${month}`);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `smart-finance-${month}.pdf`;
            anchor.click();
            URL.revokeObjectURL(url);
            toast_1.toast.success('Relatório gerado', `PDF de ${month} baixado com sucesso.`);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao gerar relatório';
            setError(message);
            toast_1.toast.error('Não foi possível gerar o relatório', message);
        }
        finally {
            setLoading(false);
        }
    }
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageHeader_1.default, { title: "Relat\u00F3rio mensal", subtitle: "Gere um PDF resumido e organizado" }), (0, jsx_runtime_1.jsxs)("section", { className: "panel report-card", children: [(0, jsx_runtime_1.jsx)("div", { className: "report-icon", children: "\u25A7" }), (0, jsx_runtime_1.jsx)("h2", { children: "Resumo financeiro em PDF" }), (0, jsx_runtime_1.jsx)("p", { children: "O arquivo inclui rendas, despesas, saldo, gastos fixos e vari\u00E1veis, cart\u00F5es e resumo por categoria." }), (0, jsx_runtime_1.jsxs)("label", { children: ["M\u00EAs de refer\u00EAncia", (0, jsx_runtime_1.jsx)("input", { className: "month-input large", type: "month", value: month, onChange: (e) => setMonth(e.target.value) })] }), error && (0, jsx_runtime_1.jsx)("div", { className: "form-error", children: error }), (0, jsx_runtime_1.jsx)("button", { className: "primary-button", onClick: download, disabled: loading, children: loading ? 'Gerando...' : 'Gerar e baixar PDF' })] })] });
}

},
"src/pages/SettingsPage.tsx":function(module,exports,require){
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SettingsPage;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const PageHeader_1 = __importDefault(require("src/components/PageHeader.tsx"));
const api_1 = require("src/services/api.ts");
const confirm_1 = require("src/services/confirm.ts");
const toast_1 = require("src/services/toast.ts");
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function waitForServerRestart() {
    // Primeiro esperamos o processo antigo realmente sair. Só então aceitamos
    // um novo /health como confirmação de que a reinicialização terminou.
    const deadline = Date.now() + 45000;
    let oldServerStopped = false;
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    while (Date.now() < deadline) {
        try {
            const response = await fetch(`/api/health?after-import=${Date.now()}`, { cache: 'no-store' });
            if (oldServerStopped && response.ok) {
                window.location.reload();
                return;
            }
        }
        catch {
            oldServerStopped = true;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 400));
    }
    window.location.reload();
}
function SettingsPage({ user, onUser }) {
    const [message, setMessage] = (0, react_1.useState)('');
    const [error, setError] = (0, react_1.useState)('');
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [importingDatabase, setImportingDatabase] = (0, react_1.useState)(false);
    const [exportingTransfer, setExportingTransfer] = (0, react_1.useState)(false);
    const [importingSync, setImportingSync] = (0, react_1.useState)(false);
    const passwordFormRef = (0, react_1.useRef)(null);
    const recoveryFormRef = (0, react_1.useRef)(null);
    const categoryFormRef = (0, react_1.useRef)(null);
    const loadCategories = () => (0, api_1.api)('/categories').then(setCategories).catch(() => undefined);
    (0, react_1.useEffect)(() => {
        void loadCategories();
    }, [user.role]);
    async function changePassword(event) {
        event.preventDefault();
        setError('');
        setMessage('');
        const form = new FormData(event.currentTarget);
        if (form.get('new_password') !== form.get('confirm_password')) {
            const warning = 'As novas senhas não conferem.';
            setError(warning);
            toast_1.toast.warning('Verifique as senhas', warning);
            return;
        }
        try {
            const response = await (0, api_1.api)('/auth/change-password', {
                method: 'POST',
                ...(0, api_1.jsonBody)({
                    current_password: form.get('current_password'),
                    new_password: form.get('new_password'),
                }),
            });
            (0, api_1.setToken)(response.token);
            setMessage(response.message);
            passwordFormRef.current?.reset();
            onUser(await (0, api_1.api)('/auth/me'));
            toast_1.toast.success('Senha alterada', response.message);
        }
        catch (err) {
            const failure = err instanceof Error ? err.message : 'Erro ao alterar senha';
            setError(failure);
            toast_1.toast.error('Não foi possível alterar a senha', failure);
        }
    }
    async function changeRecoveryKey(event) {
        event.preventDefault();
        setError('');
        setMessage('');
        const form = new FormData(event.currentTarget);
        try {
            const response = await (0, api_1.api)('/auth/change-recovery-key', {
                method: 'POST',
                ...(0, api_1.jsonBody)({
                    current_password: form.get('current_password'),
                    new_recovery_key: form.get('new_recovery_key'),
                }),
            });
            setMessage(response.message);
            recoveryFormRef.current?.reset();
            toast_1.toast.success('Chave de recuperação alterada', response.message);
        }
        catch (err) {
            const failure = err instanceof Error ? err.message : 'Erro ao alterar chave';
            setError(failure);
            toast_1.toast.error('Não foi possível alterar a chave', failure);
        }
    }
    async function createCategory(event) {
        event.preventDefault();
        setError('');
        setMessage('');
        const form = new FormData(event.currentTarget);
        try {
            await (0, api_1.api)('/categories', {
                method: 'POST',
                ...(0, api_1.jsonBody)({ name: form.get('name'), kind: form.get('kind'), is_active: true }),
            });
            setMessage('Categoria criada.');
            categoryFormRef.current?.reset();
            await loadCategories();
            toast_1.toast.success('Categoria criada', String(form.get('name')));
        }
        catch (err) {
            const failure = err instanceof Error ? err.message : 'Erro ao criar categoria';
            setError(failure);
            toast_1.toast.error('Não foi possível criar a categoria', failure);
        }
    }
    async function toggleCategory(item) {
        try {
            await (0, api_1.api)(`/categories/${item.id}`, {
                method: 'PATCH',
                ...(0, api_1.jsonBody)({ name: item.name, kind: item.kind, is_active: !item.is_active }),
            });
            await loadCategories();
            toast_1.toast.success(item.is_active ? 'Categoria ocultada' : 'Categoria ativada', item.name);
        }
        catch (err) {
            const failure = err instanceof Error ? err.message : 'Erro ao atualizar categoria';
            setError(failure);
            toast_1.toast.error('Não foi possível atualizar a categoria', failure);
        }
    }
    async function exportTransferPackage() {
        setExportingTransfer(true);
        setError('');
        try {
            const blob = await (0, api_1.api)('/transfer/export');
            const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            downloadBlob(blob, `smart-finance-para-celular-${date}.zip`);
            toast_1.toast.success('Pacote para o celular criado', 'Abra o Smart Finance no celular e importe o ZIP em Configurações.');
        }
        catch (err) {
            const failure = err instanceof Error ? err.message : 'Erro ao criar pacote para o celular';
            setError(failure);
            toast_1.toast.error('Não foi possível exportar para o celular', failure);
        }
        finally {
            setExportingTransfer(false);
        }
    }
    async function importSyncFile(event) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        setImportingSync(true);
        setError('');
        try {
            const confirmed = await (0, confirm_1.confirmAction)({ title: 'Sincronizar dados do celular?', message: 'Os lançamentos e cadastros do pacote serão mesclados aos dados deste usuário.', detail: 'O Smart Finance cria um backup automático antes da mesclagem e tenta evitar duplicações pelos identificadores dos lançamentos.', confirmLabel: 'Criar backup e sincronizar', tone: 'warning' });
            if (!confirmed)
                return;
            const body = new FormData();
            body.append('upload', file);
            const result = await (0, api_1.api)('/sync/import', { method: 'POST', body });
            const total = Object.values(result.imported || {}).reduce((sum, value) => sum + Number(value || 0), 0);
            setMessage(`${result.message}. ${total} registro(s) novo(s). Backup: ${result.backup}`);
            toast_1.toast.success('Sincronização concluída', `${total} registro(s) novo(s) foram incorporados ao computador.`);
        }
        catch (err) {
            const failure = err instanceof Error ? err.message : 'Erro ao sincronizar';
            setError(failure);
            toast_1.toast.error('Não foi possível sincronizar', failure);
        }
        finally {
            event.target.value = '';
            setImportingSync(false);
        }
    }
    async function exportDatabase() {
        try {
            setError('');
            const blob = await (0, api_1.api)('/backups/export-database');
            downloadBlob(blob, `smart-finance-${new Date().toISOString().slice(0, 10)}.db`);
            toast_1.toast.success('Banco de dados exportado', 'O arquivo SQLite foi enviado para a pasta Downloads do navegador.');
        }
        catch (err) {
            const failure = err instanceof Error ? err.message : 'Erro ao exportar banco';
            setError(failure);
            toast_1.toast.error('Não foi possível exportar o banco', failure);
        }
    }
    async function importDatabaseFile(event) {
        const file = event.target.files?.[0];
        if (!file)
            return;
        setImportingDatabase(true);
        setError('');
        setMessage('');
        try {
            const inspectBody = new FormData();
            inspectBody.append('upload', file);
            const preview = await (0, api_1.api)('/backups/inspect-database', { method: 'POST', body: inspectBody });
            const confirmed = await (0, confirm_1.confirmAction)({
                title: 'Importar este banco?',
                message: `Banco íntegro: ${preview.table_count} tabelas, ${preview.counts.expenses || 0} despesas, ${preview.counts.incomes || 0} rendas e ${preview.counts.users || 0} usuário(s).`,
                detail: `Tamanho: ${(preview.size / 1024).toFixed(1)} KB. O banco atual será salvo em backup antes da substituição.`,
                confirmLabel: 'Criar backup e importar', tone: 'danger',
            });
            if (!confirmed)
                return;
            const body = new FormData();
            body.append('upload', file);
            const response = await (0, api_1.api)('/backups/import-database', { method: 'POST', body });
            setMessage(`${response.message} Backup de segurança: ${response.safety_backup}`);
            (0, api_1.setToken)(null);
            if (response.automatic_restart) {
                toast_1.toast.success('Banco importado', 'Aguarde a reinicialização automática. Depois, entre novamente com os usuários do banco importado.');
                await waitForServerRestart();
            }
            else {
                toast_1.toast.success('Banco importado', 'Reinicie o Smart Finance e entre novamente com os usuários do banco importado.');
                window.setTimeout(() => window.location.reload(), 1200);
            }
        }
        catch (err) {
            const failure = err instanceof Error ? err.message : 'Erro ao importar banco';
            setError(failure);
            toast_1.toast.error('Não foi possível importar o banco', failure);
        }
        finally {
            event.target.value = '';
            setImportingDatabase(false);
        }
    }
    return (0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(PageHeader_1.default, { title: "Configura\u00E7\u00F5es", subtitle: "Seguran\u00E7a, categorias, backups e informa\u00E7\u00F5es do sistema" }), user.must_change_password && (0, jsx_runtime_1.jsx)("div", { className: "warning-banner", children: "A conta ainda usa uma senha tempor\u00E1ria. Altere-a antes de continuar usando o sistema." }), (0, jsx_runtime_1.jsxs)("section", { className: "settings-grid", children: [(0, jsx_runtime_1.jsxs)("form", { ref: passwordFormRef, className: "panel", onSubmit: changePassword, children: [(0, jsx_runtime_1.jsx)("h3", { children: "Alterar senha" }), (0, jsx_runtime_1.jsxs)("label", { children: ["Senha atual", (0, jsx_runtime_1.jsx)("input", { name: "current_password", type: "password", required: true })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Nova senha", (0, jsx_runtime_1.jsx)("input", { name: "new_password", type: "password", minLength: 4, required: true })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Confirmar nova senha", (0, jsx_runtime_1.jsx)("input", { name: "confirm_password", type: "password", minLength: 4, required: true })] }), (0, jsx_runtime_1.jsx)("button", { className: "primary-button", children: "Salvar nova senha" })] }), (0, jsx_runtime_1.jsxs)("form", { ref: recoveryFormRef, className: "panel", onSubmit: changeRecoveryKey, children: [(0, jsx_runtime_1.jsx)("h3", { children: "Chave de recupera\u00E7\u00E3o" }), (0, jsx_runtime_1.jsx)("p", { children: "Guarde a chave fora do sistema. Ela permite redefinir sua senha sem ajuda do administrador." }), (0, jsx_runtime_1.jsxs)("label", { children: ["Senha atual", (0, jsx_runtime_1.jsx)("input", { name: "current_password", type: "password", required: true })] }), (0, jsx_runtime_1.jsxs)("label", { children: ["Nova chave", (0, jsx_runtime_1.jsx)("input", { name: "new_recovery_key", minLength: 6, required: true })] }), (0, jsx_runtime_1.jsx)("button", { className: "secondary-button", children: "Salvar chave" })] }), (0, jsx_runtime_1.jsxs)("article", { className: "panel", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Perfil" }), (0, jsx_runtime_1.jsxs)("dl", { children: [(0, jsx_runtime_1.jsx)("dt", { children: "Nome" }), (0, jsx_runtime_1.jsx)("dd", { children: user.display_name }), (0, jsx_runtime_1.jsx)("dt", { children: "Usu\u00E1rio" }), (0, jsx_runtime_1.jsx)("dd", { children: user.username }), (0, jsx_runtime_1.jsx)("dt", { children: "E-mail" }), (0, jsx_runtime_1.jsx)("dd", { children: user.email }), (0, jsx_runtime_1.jsx)("dt", { children: "Permiss\u00E3o" }), (0, jsx_runtime_1.jsx)("dd", { children: user.role === 'admin' ? 'Administrador' : 'Usuário' })] })] }), (0, jsx_runtime_1.jsxs)("article", { className: "panel transfer-panel transfer-desktop-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "panel-title-row", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "panel-kicker", children: "Computador \u2192 celular" }), (0, jsx_runtime_1.jsx)("h3", { children: "Transferir dados para o celular" })] }), (0, jsx_runtime_1.jsx)("span", { className: "panel-icon", "aria-hidden": "true", children: "\uD83D\uDCF1" })] }), (0, jsx_runtime_1.jsx)("p", { children: "Crie um ZIP compat\u00EDvel com o aplicativo Android. O pacote inclui contas, cart\u00F5es, categorias, rendas, despesas, empr\u00E9stimos, parcelas e comprovantes do usu\u00E1rio selecionado." }), (0, jsx_runtime_1.jsxs)("ol", { className: "transfer-steps", children: [(0, jsx_runtime_1.jsx)("li", { children: "Exporte o pacote neste computador." }), (0, jsx_runtime_1.jsx)("li", { children: "Envie o arquivo ZIP para o celular." }), (0, jsx_runtime_1.jsx)("li", { children: "No APK, abra Configura\u00E7\u00F5es e toque em \u201CImportar dados do computador\u201D." })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", className: "primary-button", onClick: exportTransferPackage, disabled: exportingTransfer, children: exportingTransfer ? 'Preparando pacote...' : 'Exportar dados para o celular' })] }), (0, jsx_runtime_1.jsxs)("article", { className: "panel transfer-panel sync-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "panel-title-row", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "panel-kicker", children: "Celular \u2192 computador" }), (0, jsx_runtime_1.jsx)("h3", { children: "Sincronizar altera\u00E7\u00F5es do APK" })] }), (0, jsx_runtime_1.jsx)("span", { className: "panel-icon", "aria-hidden": "true", children: "\uD83D\uDD04" })] }), (0, jsx_runtime_1.jsx)("p", { children: "No celular, use \u201CCriar pacote .sfsync\u201D. Aqui, selecione o arquivo para mesclar despesas, rendas, cart\u00F5es, recorr\u00EAncias, or\u00E7amentos, metas e transfer\u00EAncias." }), (0, jsx_runtime_1.jsxs)("label", { className: "secondary-button file-action-button", children: [(0, jsx_runtime_1.jsx)("input", { type: "file", accept: ".sfsync,application/json", onChange: importSyncFile, disabled: importingSync }), importingSync ? 'Sincronizando...' : 'Importar pacote .sfsync'] }), (0, jsx_runtime_1.jsx)("small", { className: "muted-text", children: "Um backup \u00E9 criado antes de cada sincroniza\u00E7\u00E3o." })] }), (0, jsx_runtime_1.jsxs)("article", { className: "panel category-panel", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Categorias" }), (0, jsx_runtime_1.jsxs)("form", { ref: categoryFormRef, className: "category-form", onSubmit: createCategory, children: [(0, jsx_runtime_1.jsx)("input", { name: "name", placeholder: "Nova categoria", required: true }), (0, jsx_runtime_1.jsxs)("select", { name: "kind", children: [(0, jsx_runtime_1.jsx)("option", { value: "expense", children: "Despesa" }), (0, jsx_runtime_1.jsx)("option", { value: "income", children: "Renda" })] }), (0, jsx_runtime_1.jsx)("button", { className: "secondary-button", children: "Adicionar" })] }), (0, jsx_runtime_1.jsx)("div", { className: "category-list", children: categories.map((item) => (0, jsx_runtime_1.jsxs)("button", { className: item.is_active ? '' : 'inactive', onClick: () => toggleCategory(item), children: [(0, jsx_runtime_1.jsx)("span", { children: item.name }), (0, jsx_runtime_1.jsxs)("small", { children: [item.kind === 'expense' ? 'Despesa' : 'Renda', " \u2022 ", item.is_active ? 'Ativa' : 'Oculta'] })] }, item.id)) })] }), user.role === 'admin' && (0, jsx_runtime_1.jsxs)("article", { className: "panel backup-panel", children: [(0, jsx_runtime_1.jsxs)("div", { className: "panel-title-row", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "panel-kicker", children: "Seguran\u00E7a local" }), (0, jsx_runtime_1.jsx)("h3", { children: "Backup e banco de dados" })] }), (0, jsx_runtime_1.jsx)("span", { className: "panel-icon", "aria-hidden": "true", children: "\uD83D\uDDC4\uFE0F" })] }), (0, jsx_runtime_1.jsx)("p", { children: "O backup di\u00E1rio interno continua autom\u00E1tico. Para movimentar o banco completo, use somente as op\u00E7\u00F5es abaixo." }), (0, jsx_runtime_1.jsxs)("div", { className: "settings-button-row", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "primary-button", onClick: exportDatabase, children: "Exportar banco" }), (0, jsx_runtime_1.jsxs)("label", { className: "secondary-button file-action-button", children: [(0, jsx_runtime_1.jsx)("input", { type: "file", accept: ".db,application/vnd.sqlite3,application/octet-stream", onChange: importDatabaseFile, disabled: importingDatabase }), importingDatabase ? 'Importando banco...' : 'Importar banco'] })] })] }), (0, jsx_runtime_1.jsxs)("article", { className: "panel developer-panel", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Sobre o aplicativo" }), (0, jsx_runtime_1.jsx)("p", { children: "Aplicativo desenvolvido por Luan Claiver 2026" }), (0, jsx_runtime_1.jsx)("a", { className: "secondary-button github-project-button", href: "https://github.com/LuanClaiver/smart-finance", target: "_blank", rel: "noreferrer", children: "Abrir projeto no GitHub" })] })] }), message && (0, jsx_runtime_1.jsx)("div", { className: "success-message", children: message }), error && (0, jsx_runtime_1.jsx)("div", { className: "form-error", children: error })] });
}

},
"src/services/api.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonBody = exports.ApiError = void 0;
exports.getToken = getToken;
exports.setToken = setToken;
exports.setSelectedOwnerId = setSelectedOwnerId;
exports.api = api;
exports.money = money;
exports.today = today;
exports.currentMonth = currentMonth;
const API_BASE = '/api';
let selectedOwnerId = Number(localStorage.getItem('smart-finance-owner-id')) || null;
class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.status = status;
    }
}
exports.ApiError = ApiError;
function getToken() {
    return localStorage.getItem('smart-finance-token');
}
function setToken(token) {
    if (token)
        localStorage.setItem('smart-finance-token', token);
    else
        localStorage.removeItem('smart-finance-token');
}
function setSelectedOwnerId(ownerId) {
    selectedOwnerId = ownerId;
    if (ownerId)
        localStorage.setItem('smart-finance-owner-id', String(ownerId));
    else
        localStorage.removeItem('smart-finance-owner-id');
}
function withOwner(path) {
    const excluded = ['/auth', '/admin', '/backups', '/health'];
    if (!selectedOwnerId || excluded.some((prefix) => path.startsWith(prefix)))
        return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}owner_id=${selectedOwnerId}`;
}
async function api(path, options = {}) {
    const headers = new Headers(options.headers);
    const token = getToken();
    if (token)
        headers.set('Authorization', `Bearer ${token}`);
    if (!(options.body instanceof FormData) && options.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    const method = (options.method || 'GET').toUpperCase();
    const cache = method === 'GET' ? 'no-store' : options.cache;
    let response;
    try {
        response = await fetch(`${API_BASE}${withOwner(path)}`, { ...options, headers, cache });
    }
    catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new ApiError(`O servidor não respondeu. Detalhe: ${detail}`, 0);
    }
    if (!response.ok) {
        const raw = await response.text();
        let message = raw.trim();
        try {
            const body = raw ? JSON.parse(raw) : null;
            message = body?.detail || body?.message || message;
        }
        catch {
            // Mantém o texto bruto retornado pelo servidor.
        }
        if (!message || message === 'Internal Server Error') {
            message = `Erro HTTP ${response.status}. Consulte a janela preta do Smart Finance.`;
        }
        if (response.status === 401)
            setToken(null);
        throw new ApiError(message, response.status);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json'))
        return response.json();
    return response.blob();
}
const jsonBody = (value) => ({ body: JSON.stringify(value) });
exports.jsonBody = jsonBody;
function money(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}
function today() {
    return new Date().toISOString().slice(0, 10);
}
function currentMonth() {
    return new Date().toISOString().slice(0, 7);
}

},
"src/services/confirm.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmAction = confirmAction;
exports.subscribeToConfirmations = subscribeToConfirmations;
const EVENT_NAME = 'smart-finance-confirm';
function confirmAction(options) {
    return new Promise((resolve) => {
        const detail = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: options.title,
            message: options.message,
            detail: options.detail,
            confirmLabel: options.confirmLabel || 'Confirmar',
            cancelLabel: options.cancelLabel || 'Cancelar',
            tone: options.tone || 'default',
            resolve,
        };
        window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
    });
}
function subscribeToConfirmations(listener) {
    const handler = (event) => listener(event.detail);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
}

},
"src/services/navigation.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readNavigationTarget = readNavigationTarget;
exports.navigateTo = navigateTo;
exports.scrollToTarget = scrollToTarget;
const allowedPages = new Set([
    'dashboard', 'incomes', 'expenses', 'accounts', 'cards', 'loans', 'planning', 'import', 'reports', 'admin', 'settings',
]);
function readNavigationTarget(expectedPage) {
    const raw = window.location.hash.replace(/^#/, '');
    const [rawPage, rawQuery = ''] = raw.split('?', 2);
    const page = allowedPages.has(rawPage) ? rawPage : 'dashboard';
    const params = new URLSearchParams(rawQuery);
    const itemValue = Number(params.get('item'));
    const monthValue = params.get('month') || undefined;
    const target = {
        page,
        itemId: Number.isFinite(itemValue) && itemValue > 0 ? itemValue : undefined,
        month: monthValue && /^\d{4}-\d{2}$/.test(monthValue) ? monthValue : undefined,
    };
    if (expectedPage && target.page !== expectedPage)
        return { page: expectedPage };
    return target;
}
function navigateTo(page, itemId, month) {
    const safePage = allowedPages.has(page) ? page : 'dashboard';
    const params = new URLSearchParams();
    if (itemId && itemId > 0)
        params.set('item', String(itemId));
    if (month && /^\d{4}-\d{2}$/.test(month))
        params.set('month', month);
    const nextHash = `${safePage}${params.size ? `?${params.toString()}` : ''}`;
    if (window.location.hash.replace(/^#/, '') === nextHash) {
        window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    else {
        window.location.hash = nextHash;
    }
}
function scrollToTarget(selector) {
    window.requestAnimationFrame(() => {
        const element = document.querySelector(selector);
        if (!element)
            return;
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus?.({ preventScroll: true });
    });
}

},
"src/services/theme.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitialTheme = getInitialTheme;
exports.applyTheme = applyTheme;
const THEME_KEY = 'smart-finance-theme';
function getInitialTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light')
        return stored;
    return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}
function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(THEME_KEY, theme);
}

},
"src/services/toast.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toast = void 0;
exports.showToast = showToast;
exports.subscribeToToasts = subscribeToToasts;
const EVENT_NAME = 'smart-finance-toast';
function showToast(kind, title, message = '', duration = 3800) {
    const detail = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        kind,
        title,
        message,
        duration,
    };
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail }));
}
exports.toast = {
    success: (title, message = '', duration) => showToast('success', title, message, duration),
    error: (title, message = '', duration) => showToast('error', title, message, duration ?? 5200),
    info: (title, message = '', duration) => showToast('info', title, message, duration),
    warning: (title, message = '', duration) => showToast('warning', title, message, duration ?? 4600),
};
function subscribeToToasts(listener) {
    const handler = (event) => listener(event.detail);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
}

},
"src/types.ts":function(module,exports,require){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

}};
const __cache={};
function __req(id){
 if(id==='react') return window.__SF_REACT__;
 if(id==='react-dom/client') return window.__SF_REACTDOM__;
 if(id==='react/jsx-runtime') return window.__SF_JSX__;
 if(id==='__css__') return {};
 if(__cache[id]) return __cache[id].exports;
 const fn=__mods[id]; if(!fn) throw new Error('Módulo não encontrado: '+id);
 const module={exports:{}}; __cache[id]=module; fn(module,module.exports,__req); return module.exports;
}
__req("src/main.tsx");
})();
