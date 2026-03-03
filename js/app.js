const App = {
    cart: [],
    init: function () {
        this.setupNavigation();
        this.setupCart();
        this.setupCheckout();
        this.setupChat();
        this.setupAdmin();
        this.setupReviews();
        this.setupModals();
        this.setupRequestInfo();
        this.setupConfirm();  // ← ДОБАВЬ ЭТУ СТРОКУ
        this.renderShop();
        this.updateHuntDisplay();
        this.renderReviews('latest');
    },

    setupNavigation: function () {
        document.querySelectorAll('.btn-to-shop, .btn-to-shop-2').forEach(btn => {
            btn.addEventListener('click', () => this.navigateTo('shop'));
        });
        document.querySelectorAll('.btn-to-chat').forEach(btn => {
            btn.addEventListener('click', () => this.navigateTo('chat'));
        });

        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                // ИСПРАВЛЕНО: операторы тоже могут заходить в админку
                if (section === 'admin' && !DB.isStaff()) {
                    this.showToast('❌ Доступ только для сотрудников');
                    return;
                }
                this.navigateTo(section);
            });
        });
    },

    navigateTo: function (section) {
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        document.getElementById(section).classList.add('active');

        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        const activeNav = document.querySelector('.nav-link[data-section="' + section + '"]');
        if (activeNav) activeNav.classList.add('active');

        if (section === 'orders') this.renderClientOrders();
        if (section === 'reviews') this.renderReviews('all');
        if (section === 'chat') this.loadChat();
        if (section === 'admin') {
            this.renderAdminStats();
            this.renderOperators();
            this.renderAdminOrders();
        }
        if (section === 'home') this.renderReviews('latest');

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    // Универсальная функция подтверждения
    showConfirm: function (options) {
        const modal = document.getElementById('confirm-modal');
        const title = document.getElementById('confirm-title');
        const message = document.getElementById('confirm-message');
        const icon = document.getElementById('confirm-icon');
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');

        if (!modal || !title || !message || !icon) return;

        // Настройки
        title.textContent = options.title || 'Подтверждение';
        message.textContent = options.message || 'Вы уверены?';
        icon.textContent = options.icon || '❓';
        okBtn.textContent = options.okText || 'Подтвердить';
        cancelBtn.textContent = options.cancelText || 'Отмена';

        // Тип (для цвета иконки)
        modal.classList.remove('confirm-success', 'confirm-warning', 'confirm-danger', 'confirm-info');
        if (options.type) {
            modal.classList.add('confirm-' + options.type);
        }

        // Сохраняем callback
        this.confirmCallback = options.onConfirm;

        // Показываем окно
        modal.style.display = 'block';
    },

    // Закрытие окна подтверждения
    closeConfirm: function () {
        const modal = document.getElementById('confirm-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.confirmCallback = null;
    },

    // Обработка подтверждения
    handleConfirm: function (confirmed) {
        if (confirmed && this.confirmCallback) {
            this.confirmCallback();
        }
        this.closeConfirm();
    },

    // Настройка окна подтверждения
    setupConfirm: function () {
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');

        if (okBtn) {
            okBtn.addEventListener('click', () => {
                this.handleConfirm(true);
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.handleConfirm(false);
            });
        }

        // Закрытие по крестику и overlay
        document.querySelectorAll('[data-close="confirm"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.handleConfirm(false);
            });
        });
    },

    setupModals: function () {
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', function () {
                const modalId = this.dataset.close + '-modal';
                document.getElementById(modalId).style.display = 'none';
            });
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function () {
                this.parentElement.style.display = 'none';
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
            }
        });
    },

    setupCart: function () {
        document.getElementById('cart-btn').addEventListener('click', () => this.openCart());
        document.getElementById('checkout-btn').addEventListener('click', () => this.openCheckout());
    },

    renderShop: function () {
        const grid = document.getElementById('products-grid');
        const products = DB.getProducts();

        grid.innerHTML = products.map(p => `
            <div class="product-card">
                <h3>${p.name}</h3>
                <p class="product-desc">${p.desc}</p>
                <span class="product-price">$${p.price}</span>
                <button class="btn-small add-to-cart" data-id="${p.id}">В корзину</button>
            </div>
        `).join('');

        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToCart(btn.dataset.id);
            });
        });
    },

    addToCart: function (productId) {
        const product = DB.getProducts().find(p => p.id === productId);
        if (!product) return;

        const existing = this.cart.find(item => item.id === productId);
        if (existing) {
            existing.qty++;
        } else {
            this.cart.push({ ...product, qty: 1 });
        }

        this.updateCartCount();
        this.showToast('✅ ' + product.name + ' добавлен в корзину');
    },

    updateCartCount: function () {
        const count = this.cart.reduce((sum, item) => sum + item.qty, 0);
        document.getElementById('cart-count').textContent = count;
    },

    openCart: function () {
        const container = document.getElementById('cart-items');

        if (this.cart.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px 20px">Ваша корзина пуста 🛒<br><br>Добавьте товары из каталога</p>';
        } else {
            container.innerHTML = this.cart.map((item, index) => `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-qty">${item.qty} шт. × $${item.price}</div>
                    </div>
                    <div class="cart-item-price">$${item.price * item.qty}</div>
                    <button class="cart-item-remove" data-index="${index}">×</button>
                </div>
            `).join('');

            container.querySelectorAll('.cart-item-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeFromCart(parseInt(btn.dataset.index));
                });
            });
        }

        const total = this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        document.getElementById('cart-total').textContent = total;
        document.getElementById('cart-modal').style.display = 'block';
    },

    closeCart: function () {
        document.getElementById('cart-modal').style.display = 'none';
    },

    removeFromCart: function (index) {
        this.cart.splice(index, 1);
        this.updateCartCount();
        this.openCart();
    },

    getCartTotal: function () {
        return this.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    },

    setupCheckout: function () {
        const checkoutForm = document.getElementById('checkout-form');

        if (checkoutForm) {
            checkoutForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('📝 Форма отправлена');
                this.processPayment();
            });
        }

        // Закрытие по крестику
        const closeCheckout = document.getElementById('close-checkout');
        if (closeCheckout) {
            closeCheckout.addEventListener('click', () => this.closeCheckout());
        }
    },

    openCheckout: function () {
        if (this.cart.length === 0) {
            this.showToast('⚠️ Корзина пуста');
            return;
        }
        this.closeCart();
        document.getElementById('checkout-total').textContent = this.getCartTotal();
        this.generateCheckoutForm();
        document.getElementById('checkout-modal').style.display = 'block';
    },

    closeCheckout: function () {
        document.getElementById('checkout-modal').style.display = 'none';
    },

    generateCheckoutForm: function () {
        const container = document.getElementById('dynamic-form-fields');
        const session = DB.getSession();
        let html = `
            <div class="form-group">
                <label>Ваш никнейм в игре *</label>
                <input type="text" id="form-nick" value="${session?.nick || ''}" required placeholder="Точно как в игре">
            </div>
        `;

        const types = [...new Set(this.cart.map(i => i.type))];

        if (types.includes('resources')) {
            html += `
                <div class="form-group">
                    <label>Название гильдии (должна быть открыта) *</label>
                    <input type="text" id="form-guild" required placeholder="Например: BCT Warriors">
                </div>
                <div class="form-group">
                    <label>Координаты замка *</label>
                    <input type="text" id="form-coords" required placeholder="X:000, Y:000">
                </div>
                <p style="font-size:0.85rem;color:var(--warning);margin:-10px 0 15px">⚠️ Пожалуйста, встаньте на открытую местность перед передачей ресурсов</p>
            `;
        }

        if (types.includes('gems')) {
            html += `
                <div class="form-group">
                    <label>Гильдия для дарения *</label>
                    <input type="text" id="form-guild-gem" required placeholder="Название гильдии">
                </div>
                <div class="form-group">
                    <label>Какие предметы нужно подарить? *</label>
                    <textarea id="form-gift" required placeholder="Например: ускорения 15 мин, золотые ключи, материалы..."></textarea>
                </div>
            `;
        }

        if (types.includes('hunt')) {
            const s = DB.getSettings();
            html += `
                <div style="background:var(--input);padding:20px;border-radius:var(--radius);margin:20px 0;border:1px solid var(--border)">
                    <p style="margin:8px 0"><strong>🎯 Охота на:</strong> <span style="color:var(--accent)">${s.mob}</span></p>
                    <p style="margin:8px 0"><strong>🏰 Гильдия:</strong> <span style="color:var(--accent)">${s.guild}</span></p>
                    <p style="margin:8px 0"><strong>⏰ Время сбора:</strong> <span style="color:var(--accent)">${s.time}</span></p>
                </div>
                <div class="form-group">
                    <label>Подтверждение *</label>
                    <select id="form-hunt-confirm" required>
                        <option value="">Выберите...</option>
                        <option value="yes">✅ Да, я подтверждаю вступление в гильдию для охоты</option>
                    </select>
                </div>
            `;
        }

        container.innerHTML = html;
    },

    processPayment: function () {
        console.log('💳 Начало оплаты...');

        const session = DB.getSession();
        if (!session?.nick) {
            this.showToast('❌ Ошибка авторизации. Войдите снова.');
            return;
        }

        const nickInput = document.getElementById('form-nick');
        const nick = nickInput ? nickInput.value.trim() : '';

        if (!nick) {
            this.showToast('⚠️ Укажите никнейм в игре');
            // Подсветка поля
            if (nickInput) {
                nickInput.style.borderColor = 'var(--danger)';
                nickInput.focus();
            }
            return;
        }

        // Проверка для ресурсов
        if (this.cart.some(i => i.type === 'resources')) {
            const guildInput = document.getElementById('form-guild');
            const coordsInput = document.getElementById('form-coords');
            const guild = guildInput ? guildInput.value.trim() : '';
            const coords = coordsInput ? coordsInput.value.trim() : '';

            if (!guild || !coords) {
                this.showToast('⚠️ Заполните гильдию и координаты');
                if (guildInput && !guild) {
                    guildInput.style.borderColor = 'var(--danger)';
                    guildInput.focus();
                }
                return;
            }
        }

        // Проверка для самоцветов
        if (this.cart.some(i => i.type === 'gems')) {
            const guildInput = document.getElementById('form-guild-gem');
            const giftInput = document.getElementById('form-gift');
            const guild = guildInput ? guildInput.value.trim() : '';
            const gift = giftInput ? giftInput.value.trim() : '';

            if (!guild || !gift) {
                this.showToast('⚠️ Укажите гильдию и список подарков');
                if (giftInput && !gift) {
                    giftInput.style.borderColor = 'var(--danger)';
                    giftInput.focus();
                }
                return;
            }
        }

        // Проверка для охоты
        if (this.cart.some(i => i.type === 'hunt')) {
            const confirmInput = document.getElementById('form-hunt-confirm');
            const confirm = confirmInput ? confirmInput.value : '';

            if (!confirm) {
                this.showToast('⚠️ Подтвердите вступление в гильдию');
                if (confirmInput) {
                    confirmInput.style.borderColor = 'var(--danger)';
                    confirmInput.focus();
                }
                return;
            }
        }

        // Создание заказа
        const order = {
            id: 'ORD-' + Date.now().toString(36).toUpperCase(),
            nick: nick,
            items: this.cart.map(i => i.name + ' ×' + i.qty).join(', '),
            total: this.getCartTotal(),
            status: 'pending',
            reviewed: false,
            createdAt: Date.now(),
            paymentMethod: document.getElementById('payment-method').value
        };

        console.log('✅ Создаём заказ:', order);

        DB.addOrder(order);
        DB.addMessage('admin', 'BCT System', '🔔 <strong>Новый заказ ' + order.id + '</strong><br>Клиент: ' + order.nick + '<br>Сумма: <strong>$' + order.total + '</strong><br>Ожидайте подтверждения оператора.');

        this.cart = [];
        this.updateCartCount();
        this.closeCheckout();
        this.showToast('✅ Заказ успешно оформлен! Ожидайте подтверждения в чате.');
        this.loadChat();

        // Предложить оставить отзыв через 3 секунды
        setTimeout(() => {
            const reviewModal = document.getElementById('review-modal');
            if (reviewModal) {
                reviewModal.style.display = 'block';
            }
        }, 3000);
    },

    setupChat: function () {
        document.getElementById('chat-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });
    },

    loadChat: function () {
        const box = document.getElementById('chat-history');
        box.innerHTML = '';
        DB.getMessages().forEach(m => {
            const session = DB.getSession();
            const isMe = m.sender === 'client' && session?.nick;
            const isStaff = m.sender && ['admin', 'operator'].includes(m.sender);
            const time = new Date(m.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

            box.innerHTML += `
                <div class="message ${isMe ? 'msg-client' : (isStaff ? 'msg-admin' : 'msg-operator')}">
                    <div class="message-meta">${m.senderName} • ${time}</div>
                    ${m.text}
                </div>
            `;
        });
        box.scrollTop = box.scrollHeight;
    },

    sendMessage: function () {
        const input = document.getElementById('chat-input');
        const text = input.value.trim();
        if (!text) return;

        const session = DB.getSession();
        DB.addMessage('client', session?.nick || 'Клиент', text);

        input.value = '';
        this.loadChat();

        if (!DB.isStaff()) {
            setTimeout(() => {
                DB.addMessage('admin', 'BCT Support', '👋 Спасибо за сообщение! Оператор ответит в ближайшее время (обычно 5-10 минут).');
                this.loadChat();
            }, 1500);
        }
    },

    setupAdmin: function () {
        document.getElementById('hunt-settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveHuntSettings();
        });

        document.querySelector('.btn-add-operator').addEventListener('click', () => {
            document.getElementById('operator-modal').style.display = 'block';
        });

        document.getElementById('operator-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addOperator();
        });

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderAdminOrders(e.target.dataset.filter);
            });
        });
    },

    updateHuntDisplay: function () {
        const s = DB.getSettings();
        document.getElementById('display-hunt-mob').textContent = s.mob || 'Не указано';
        document.getElementById('display-hunt-guild').textContent = s.guild || 'Не указано';
        document.getElementById('display-hunt-time').textContent = s.time || 'Не указано';

        document.getElementById('admin-hunt-mob').value = s.mob || '';
        document.getElementById('admin-hunt-guild').value = s.guild || '';
        document.getElementById('admin-hunt-time').value = s.time || '';
    },

    saveHuntSettings: function () {
        DB.saveSettings({
            mob: document.getElementById('admin-hunt-mob').value,
            guild: document.getElementById('admin-hunt-guild').value,
            time: document.getElementById('admin-hunt-time').value
        });
        this.updateHuntDisplay();
        this.showToast('✅ Настройки охоты сохранены');
    },

    renderAdminStats: function () {
        const orders = DB.getOrders();
        document.getElementById('stat-pending').textContent = orders.filter(o => o.status === 'pending').length;
        document.getElementById('stat-completed').textContent = orders.filter(o => o.status === 'completed').length;
        document.getElementById('stat-operators').textContent = DB.getOperators().length;
    },

    renderOperators: function () {
        const list = document.getElementById('operators-list');
        const myId = DB.getSession()?.id;
        const myRole = DB.getSession()?.role;

        list.innerHTML = DB.getOperators().map(op => `
        <div class="operator-item">
            <div class="operator-info">
                <div class="name">${this.escapeHtml(op.name)}</div>
                <div class="meta">${op.login} • ${op.role === 'admin' ? 'Администратор' : 'Оператор'}</div>
            </div>
            ${op.id !== myId ? `
                <button class="btn-remove" data-op-id="${op.id}" ${myRole !== 'admin' ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>
                    ${myRole !== 'admin' ? '🔒 Только админ' : 'Удалить'}
                </button>
            ` : '<span style="color:var(--success);font-size:0.85rem">✓ Вы</span>'}
        </div>
    `).join('');

        list.querySelectorAll('.btn-remove').forEach(btn => {
            if (!btn.disabled) {
                btn.addEventListener('click', function () {
                    App.removeOperator(this.dataset.opId);
                });
            }
        });
    },

    addOperator: function () {
        if (!DB.isAdmin()) {
            this.showToast('❌ Только администратор может добавлять сотрудников');
            return;
        }

        const data = {
            name: document.getElementById('op-name').value.trim(),
            login: document.getElementById('op-login').value.trim(),
            password: document.getElementById('op-pass').value,
            role: document.getElementById('op-role').value
        };

        if (!data.name || !data.login || !data.password) {
            this.showToast('⚠️ Заполните все поля');
            return;
        }

        if (DB.addOperator(data)) {
            document.getElementById('operator-modal').style.display = 'none';
            this.renderOperators();
            this.renderAdminStats();
            this.showToast('✅ Сотрудник успешно добавлен');
        } else {
            this.showToast('❌ Такой логин уже существует');
        }
    },

    removeOperator: function (id) {
        if (!DB.isAdmin()) {
            this.showToast('❌ Только главный администратор может удалять сотрудников');
            return;
        }

        this.showConfirm({
            title: 'Удаление сотрудника',
            message: 'Вы уверены, что хотите удалить этого сотрудника? Он потеряет доступ к панели.',
            icon: '👤',
            type: 'warning',
            okText: 'Удалить',
            cancelText: 'Отмена',
            onConfirm: () => {
                DB.removeOperator(id);
                this.renderOperators();
                this.renderAdminStats();
                this.showToast('🗑 Сотрудник удалён');
            }
        });
    },

    renderAdminOrders: function (filter) {
        filter = filter || 'all';
        const container = document.getElementById('admin-orders');
        let orders = DB.getOrders().reverse();

        if (filter !== 'all') {
            orders = orders.filter(o => o.status === filter);
        }

        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px">Заказов не найдено</p>';
            return;
        }

        container.innerHTML = orders.map(o => {
            const date = new Date(o.createdAt).toLocaleString('ru-RU');
            return `
                <div class="order-card ${o.status === 'completed' ? 'completed' : ''}">
                    <div class="order-info">
                        <h4>${o.id}</h4>
                        <div class="order-meta">${date}</div>
                        <div style="margin:8px 0"><strong>Клиент:</strong> ${o.nick}</div>
                        <div class="order-items">${o.items}</div>
                    </div>
                    <div style="text-align:right;min-width:180px">
                        <div style="font-weight:700;color:var(--accent);font-size:1.3rem;margin-bottom:8px">$${o.total}</div>
                        <span class="order-status status-${o.status}">
                            ${o.status === 'completed' ? '✓ Выполнен' : '⏳ В обработке'}
                        </span>
                        ${o.status === 'pending' ? `
                        <div class="order-actions" style="margin-top:12px;justify-content:flex-end">
                            <button class="btn-small btn-complete" data-order-id="${o.id}">✓ Выполнить</button>
                            <button class="btn-small btn-info" data-order-id="${o.id}">❓ Запрос</button>
                            <button class="btn-small btn-delete" data-order-id="${o.id}">🗑</button>
                        </div>` : ''}
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.btn-complete').forEach(btn => {
            btn.addEventListener('click', function () {
                App.completeOrder(this.dataset.orderId);
            });
        });
        container.querySelectorAll('.btn-info').forEach(btn => {
            btn.addEventListener('click', function () {
                App.requestInfo(this.dataset.orderId);
            });
        });
        container.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', function () {
                App.deleteOrder(this.dataset.orderId);
            });
        });
    },

    // ИСПРАВЛЕНО: уведомление клиента и отзыв
    completeOrder: function (orderId) {
        this.showConfirm({
            title: 'Выполнение заказа',
            message: 'Отметить этот заказ как выполненный? Клиент получит уведомление.',
            icon: '✅',
            type: 'success',
            okText: 'Выполнить',
            cancelText: 'Отмена',
            onConfirm: () => {
                DB.updateOrder(orderId, { status: 'completed' });

                const order = DB.getOrders().find(o => o.id === orderId);
                if (order) {
                    const session = DB.getSession();
                    DB.addMessage('admin', session?.name || 'Оператор',
                        '✅ <strong>Заказ ' + orderId + '</strong> выполнен!<br><br>Ресурсы должны быть у вас. Если возникнут вопросы — напишите в поддержку. Спасибо за покупку! 🏖'
                    );
                }

                this.renderAdminOrders();
                this.renderAdminStats();
                this.loadChat();
                this.showToast('✅ Заказ успешно завершён');
            }
        });
    },


    requestInfo: function (orderId) {
        // Сохраняем ID заказа в переменной
        this.currentRequestId = orderId;

        // Открываем модальное окно
        const modal = document.getElementById('request-info-modal');
        if (modal) {
            modal.style.display = 'block';

            // Очищаем поле
            const textarea = document.getElementById('request-info-text');
            if (textarea) {
                textarea.value = 'Здравствуйте! Подскажите, пожалуйста...';
                textarea.focus();
            }

            // Обновляем предпросмотр
            const preview = document.getElementById('request-info-preview');
            if (preview && textarea) {
                preview.textContent = textarea.value;

                // Живое обновление предпросмотра
                textarea.addEventListener('input', function () {
                    preview.textContent = this.value || 'Текст запроса...';
                });
            }
        }
    },

    setupRequestInfo: function () {
        const form = document.getElementById('request-info-form');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();

                const orderId = this.currentRequestId;
                const textarea = document.getElementById('request-info-text');
                const info = textarea ? textarea.value.trim() : '';

                if (!info) {
                    this.showToast('⚠️ Введите текст запроса');
                    return;
                }

                const order = DB.getOrders().find(o => o.id === orderId);
                if (order) {
                    const session = DB.getSession();
                    DB.addMessage('admin', session?.name || 'Оператор',
                        '📋 <strong>Заказ ' + orderId + '</strong><br><br>' + info + '<br><br>Пожалуйста, ответьте для продолжения обработки заказа.'
                    );
                }

                // Закрываем окно
                const modal = document.getElementById('request-info-modal');
                if (modal) {
                    modal.style.display = 'none';
                }

                this.loadChat();
                this.showToast('💬 Запрос отправлен клиенту');
                this.currentRequestId = null;
            });
        }

        // Закрытие по крестику и overlay
        document.querySelectorAll('[data-close="request-info"]').forEach(btn => {
            btn.addEventListener('click', function () {
                const modal = document.getElementById('request-info-modal');
                if (modal) {
                    modal.style.display = 'none';
                }
                App.currentRequestId = null;
            });
        });
    },

    deleteOrder: function (orderId) {
        this.showConfirm({
            title: 'Удаление заказа',
            message: 'Вы уверены, что хотите удалить этот заказ? Это действие нельзя отменить.',
            icon: '🗑',
            type: 'danger',
            okText: 'Удалить',
            cancelText: 'Отмена',
            onConfirm: () => {
                DB.updateOrder(orderId, { status: 'cancelled' });
                this.renderAdminOrders();
                this.renderAdminStats();
                this.showToast('🗑 Заказ удалён');
            }
        });
    },

    setupReviews: function () {
        document.getElementById('review-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitReview();
        });
    },

    renderReviews: function (scope) {
        scope = scope || 'latest';
        const reviews = DB.getReviews();
        const containerId = scope === 'latest' ? 'latest-reviews' : 'all-reviews';
        const container = document.getElementById(containerId);
        if (!container) return;

        if (reviews.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px;grid-column:1/-1">Пока нет отзывов</p>';
            return;
        }

        const items = scope === 'latest' ? reviews.slice(0, 3) : reviews;

        container.innerHTML = items.map(r => {
            const date = new Date(r.timestamp).toLocaleDateString('ru-RU');
            const stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
            return `
                <div class="review-card">
                    <div class="review-header">
                        <span class="review-user">${this.escapeHtml(r.user)}</span>
                        <span class="review-date">${date}</span>
                    </div>
                    <div class="review-stars">${stars}</div>
                    <p class="review-text">${this.escapeHtml(r.text)}</p>
                </div>
            `;
        }).join('');
    },

    submitReview: function () {
        const stars = document.querySelector('input[name="rating"]:checked');
        const text = document.getElementById('review-text').value.trim();

        if (!stars) {
            this.showToast('⚠️ Выберите оценку');
            return;
        }
        if (!text) {
            this.showToast('⚠️ Напишите комментарий');
            return;
        }

        const session = DB.getSession();
        DB.addReview(session?.nick || 'Покупатель', stars.value, text);

        const orders = DB.getOrders();
        orders.forEach(o => {
            if (o.nick === session?.nick && o.status === 'completed') o.reviewed = true;
        });
        DB.set('orders', orders);

        document.getElementById('review-modal').style.display = 'none';
        this.renderReviews('latest');
        this.renderReviews('all');
        this.showToast('🏖 Спасибо за ваш отзыв!');
    },

    // ИСПРАВЛЕНО: заказы клиента с возможностью оставить отзыв
    renderClientOrders: function () {
        const session = DB.getSession();
        if (!session?.nick) return;

        const orders = DB.getOrdersByNick(session.nick).reverse();
        const container = document.getElementById('client-orders');
        const empty = document.getElementById('no-orders');

        if (!container || !empty) return;

        if (orders.length === 0) {
            container.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');

        container.innerHTML = orders.map(o => {
            const date = new Date(o.createdAt).toLocaleString('ru-RU');
            const canReview = o.status === 'completed' && !o.reviewed;

            return `
                <div class="order-card ${o.status === 'completed' ? 'completed' : ''}">
                    <div class="order-info">
                        <h4>Заказ ${o.id}</h4>
                        <div class="order-meta">${date}</div>
                        <div class="order-items">${o.items}</div>
                        ${canReview ? '<p style="color:var(--warning);font-size:0.85rem;margin-top:8px">⭐ Оставьте отзыв о заказе</p>' : ''}
                    </div>
                    <div class="order-footer">
                        <span class="order-total">$${o.total}</span>
                        <span class="order-status status-${o.status}">
                            ${o.status === 'completed' ? '✓ Выполнен' : '⏳ В обработке'}
                        </span>
                        ${canReview ? '<button class="btn-small btn-review" data-order-id="' + o.id + '">⭐ Оставить отзыв</button>' : ''}
                    </div>
                </div>
            `;
        }).join('');

        // ИСПРАВЛЕНО: кнопка отзыва в заказах клиента
        container.querySelectorAll('.btn-review').forEach(btn => {
            btn.addEventListener('click', function () {
                document.getElementById('review-modal').style.display = 'block';
            });
        });
    },

    showToast: function (message) {
        const toast = document.getElementById('toast');
        const msgEl = document.getElementById('toast-msg');
        if (!toast || !msgEl) return;

        msgEl.textContent = message;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3500);
    },

    escapeHtml: function (text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.addEventListener('DOMContentLoaded', () => {
    App.init();
});
