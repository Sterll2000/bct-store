const DB = {
    init: function () {
        if (!localStorage.getItem('bct_products')) {
            localStorage.setItem('bct_products', JSON.stringify([
                { id: 'g100', name: '100 Самоцветов', price: 5, type: 'gems', desc: 'Базовый пакет для старта' },
                { id: 'g500', name: '500 Самоцветов', price: 22, type: 'gems', desc: 'Выгодный набор' },
                { id: 'g1000', name: '1000 Самоцветов', price: 40, type: 'gems', desc: 'Максимальная выгода' },
                { id: 'r1k', name: '1,000 Ресурсов', price: 3, type: 'resources', desc: 'Еда или дерево' },
                { id: 'r10k', name: '10,000 Ресурсов', price: 25, type: 'resources', desc: 'Для развития замка' },
                { id: 'h5', name: 'Билет на охоту ×5', price: 15, type: 'hunt', desc: 'Участие в охоте' },
                { id: 'h10', name: 'Билет на охоту ×10', price: 28, type: 'hunt', desc: 'Выгодный пакет' }
            ]));
        }
        if (!localStorage.getItem('bct_settings')) {
            localStorage.setItem('bct_settings', JSON.stringify({
                mob: 'Дракон',
                guild: 'BCT Warriors',
                time: '20:00 МСК'
            }));
        }
        if (!localStorage.getItem('bct_messages')) {
            localStorage.setItem('bct_messages', JSON.stringify([
                { id: 1, sender: 'admin', senderName: 'BCT Support', text: '👋 Добро пожаловать в поддержку BCT Store! Опишите ваш вопрос, и мы поможем.', timestamp: Date.now() }
            ]));
        }
        if (!localStorage.getItem('bct_reviews')) {
            localStorage.setItem('bct_reviews', JSON.stringify([
                { id: 1, user: 'DragonSlayer', stars: 5, text: 'Всё быстро и качественно. Ресурсы пришли за 10 минут. Рекомендую!', timestamp: Date.now() - 86400000 },
                { id: 2, user: 'GuildMaster', stars: 5, text: 'Помогли с охотой, вся гильдия довольна. Спасибо команде BCT!', timestamp: Date.now() - 172800000 },
                { id: 3, user: 'ProGamer2024', stars: 4, text: 'Хороший магазин, цены адекватные. Буду заказывать ещё.', timestamp: Date.now() - 259200000 }
            ]));
        }
        if (!localStorage.getItem('bct_orders')) {
            localStorage.setItem('bct_orders', JSON.stringify([]));
        }
        if (!localStorage.getItem('bct_operators')) {
            localStorage.setItem('bct_operators', JSON.stringify([
                { id: 'admin-1', name: 'Главный администратор', login: 'admin', password: 'admin', role: 'admin', active: true, createdAt: Date.now() }
            ]));
        }
        if (!localStorage.getItem('bct_session')) {
            localStorage.setItem('bct_session', JSON.stringify(null));
        }
    },

    get: function (key) {
        const data = localStorage.getItem('bct_' + key);
        return data ? JSON.parse(data) : null;
    },

    set: function (key, value) {
        localStorage.setItem('bct_' + key, JSON.stringify(value));
    },

    getSession: function () {
        return this.get('session');
    },

    setSession: function (user) {
        this.set('session', user);
    },

    clearSession: function () {
        this.set('session', null);
    },

    isAuthenticated: function () {
        return !!this.getSession();
    },

    isStaff: function () {
        const s = this.getSession();
        return s && s.role && ['admin', 'operator'].includes(s.role);
    },

    isAdmin: function () {
        const s = this.getSession();
        return s && s.role === 'admin';
    },

    getProducts: function () {
        return this.get('products') || [];
    },

    getSettings: function () {
        return this.get('settings') || {};
    },

    saveSettings: function (data) {
        this.set('settings', data);
    },

    getMessages: function () {
        return this.get('messages') || [];
    },

    addMessage: function (sender, senderName, text) {
        const msgs = this.getMessages();
        msgs.push({ id: Date.now(), sender: sender, senderName: senderName, text: text, timestamp: Date.now() });
        this.set('messages', msgs);
    },

    getReviews: function () {
        return this.get('reviews') || [];
    },

    addReview: function (user, stars, text) {
        const revs = this.getReviews();
        revs.unshift({ id: Date.now(), user: user, stars: parseInt(stars), text: text, timestamp: Date.now() });
        this.set('reviews', revs);
    },

    getOrders: function () {
        return this.get('orders') || [];
    },

    addOrder: function (order) {
        const orders = this.getOrders();
        orders.push(order);
        this.set('orders', orders);
    },

    updateOrder: function (orderId, updates) {
        const orders = this.getOrders();
        const idx = orders.findIndex(o => o.id === orderId);
        if (idx !== -1) {
            orders[idx] = { ...orders[idx], ...updates };
            this.set('orders', orders);
            return true;
        }
        return false;
    },

    getOrdersByNick: function (nick) {
        return this.getOrders().filter(o => o.nick.toLowerCase() === nick.toLowerCase());
    },

    getOperators: function () {
        return this.get('operators') || [];
    },

    addOperator: function (data) {
        const ops = this.getOperators();
        if (ops.find(o => o.login === data.login)) return false;
        ops.push({ id: Date.now().toString(), ...data, active: true, createdAt: Date.now() });
        this.set('operators', ops);
        return true;
    },

    removeOperator: function (id) {
        let ops = this.getOperators();
        ops = ops.filter(o => o.id !== id);
        this.set('operators', ops);
    },

    verifyOperator: function (login, password) {
        const ops = this.getOperators();
        return ops.find(o => o.login === login && o.password === password && o.active);
    }
};

DB.init();
