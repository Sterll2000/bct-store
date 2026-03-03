const Auth = {
    init: function () {
        this.setupTabs();
        this.setupForms();
        this.setupLogout();
        this.checkAuth();
    },

    setupTabs: function () {
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');

                const tabType = this.dataset.tab;
                document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
                document.getElementById(tabType === 'client' ? 'client-form' : 'staff-form').classList.add('active');
            });
        });
    },

    setupForms: function () {
        document.getElementById('client-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.loginClient();
        });

        document.getElementById('staff-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.loginStaff();
        });
    },

    setupLogout: function () {
        document.getElementById('logout-btn').addEventListener('click', () => {
            App.showConfirm({
                title: 'Выход из аккаунта',
                message: 'Вы уверены, что хотите выйти? Вам нужно будет войти снова.',
                icon: '🚪',
                type: 'info',
                okText: 'Выйти',
                cancelText: 'Отмена',
                onConfirm: () => {
                    DB.clearSession();
                    location.reload();
                }
            });
        });

        // Кнопка в модальном окне logout (если используешь старое окно)
        document.getElementById('confirm-logout')?.addEventListener('click', () => {
            DB.clearSession();
            location.reload();
        });
    },

    loginClient: function () {
        const nick = document.getElementById('client-nick').value.trim();
        if (!nick) {
            App.showToast('⚠️ Введите никнейм');
            return;
        }
        DB.setSession({ nick: nick, name: nick, role: null });
        this.checkAuth();
        App.showToast('🎮 Добро пожаловать в BCT Store!');
    },

    loginStaff: function () {
        const login = document.getElementById('staff-login').value.trim();
        const pass = document.getElementById('staff-pass').value;
        const operator = DB.verifyOperator(login, pass);

        if (!operator) {
            App.showToast('❌ Неверный логин или пароль');
            return;
        }

        DB.setSession({
            id: operator.id,
            name: operator.name,
            login: operator.login,
            role: operator.role
        });

        this.checkAuth();
        App.renderAdminStats();
        App.renderOperators();
        App.renderAdminOrders();
        App.showToast('👋 Привет, ' + operator.name + '!');
    },

    checkAuth: function () {
        const session = DB.getSession();
        if (!session) return;

        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById('user-name').textContent = session.name || session.nick;

        const roleEl = document.getElementById('user-role');
        if (session.role) {
            const roleLabels = { admin: 'Админ', operator: 'Оператор' };
            roleEl.textContent = roleLabels[session.role] || '';
            roleEl.style.display = 'inline';

            // ИСПРАВЛЕНО: операторы тоже получают доступ к админке
            document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));

            if (session.role === 'admin' || session.role === 'operator') {
                setTimeout(() => App.navigateTo('admin'), 100);
            }
        } else {
            roleEl.style.display = 'none';
        }
    }
};

window.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});
