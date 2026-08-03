/**
 * AirLLM Enterprise Studio - JS Engine (Julho de 2026)
 * SPA Completa com CRUD real, Streaming por EventSource (SSE), Chart.js e Estado Local.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ESTADO DA APLICAÇÃO
    const state = {
        activeTab: 'dashboard',
        models: [],
        prompts: [],
        conversations: [],
        currentConversationId: null,
        userSettings: {},
        activeModel: null,
        activeCategoryFilter: 'Todos',
        charts: {}
    };

    // INICIALIZAÇÃO DA APLICAÇÃO
    initApp();

    async function initApp() {
        setupNavigation();
        setupProfileDropdown();
        setupModals();
        
        await fetchUserSettings();
        await refreshAllData();

        initCharts();
        setupChatForm();
        setupQuickActions();

        // Atualização periódica de estatísticas
        setInterval(fetchMetricsSummary, 10000);
    }

    // ==========================================================================
    // NAVEGAÇÃO & TABS
    // ==========================================================================
    function setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const pageTitle = document.getElementById('page-title');

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTab = item.getAttribute('data-tab');
                switchTab(targetTab);
            });
        });

        // Toggle Sidebar
        const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
        const sidebar = document.querySelector('.sidebar');
        if (btnToggleSidebar) {
            btnToggleSidebar.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }
    }

    function switchTab(tabId) {
        state.activeTab = tabId;

        // Atualizar itens ativos na sidebar
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.getAttribute('data-tab') === tabId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Alternar views
        document.querySelectorAll('.tab-view').forEach(view => {
            view.classList.remove('active');
        });

        const targetView = document.getElementById(`view-${tabId}`);
        if (targetView) targetView.classList.add('active');

        // Atualizar título da página
        const pageTitle = document.getElementById('page-title');
        const titles = {
            dashboard: 'Dashboard Executivo',
            chat: 'Playground Studio',
            models: 'Gestão de Modelos HuggingFace',
            prompts: 'Biblioteca de Prompts de Elite',
            metrics: 'Monitor de Performance & GPU VRAM',
            settings: 'Configurações do Sistema'
        };
        if (pageTitle) pageTitle.textContent = titles[tabId] || 'AirLLM Studio';

        // Recarregar dados específicos da aba se necessário
        if (tabId === 'models') renderModelsGrid();
        if (tabId === 'prompts') renderPromptsGrid();
        if (tabId === 'metrics') renderLiveMetricsChart();
    }

    // ==========================================================================
    // DROPDOWN DE PERFIL
    // ==========================================================================
    function setupProfileDropdown() {
        const btnDropdown = document.getElementById('btn-profile-dropdown');
        const menu = document.getElementById('profile-dropdown-menu');

        if (btnDropdown && menu) {
            btnDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('show');
            });

            document.addEventListener('click', () => {
                menu.classList.remove('show');
            });

            document.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const action = item.getAttribute('data-action');
                    if (action === 'go-settings') switchTab('settings');
                    if (action === 'go-metrics') switchTab('metrics');
                });
            });
        }
    }

    // ==========================================================================
    // REQUISIÇÕES DE DADOS DA API
    // ==========================================================================
    async function refreshAllData() {
        await Promise.all([
            fetchModels(),
            fetchPrompts(),
            fetchConversations(),
            fetchMetricsSummary(),
            fetchDiagnostics()
        ]);
    }

    async function fetchUserSettings() {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                state.userSettings = await res.json();
                updateUserSettingsUI();
            }
        } catch (err) {
            console.error("Erro ao carregar configurações:", err);
        }
    }

    function updateUserSettingsUI() {
        const set = state.userSettings;
        if (!set) return;

        document.getElementById('header-user-name').textContent = set.user_name || 'Engenheiro AirLLM';
        document.getElementById('header-user-role').textContent = set.user_role || 'Especialista PhD & MBA';
        document.getElementById('dropdown-user-name').textContent = set.user_name || 'Engenheiro AirLLM';
        document.getElementById('dropdown-user-role').textContent = set.user_role || 'Especialista PhD & MBA';

        document.getElementById('set-user-name').value = set.user_name || '';
        document.getElementById('set-user-role').value = set.user_role || '';
        document.getElementById('set-temp').value = set.temperature || 0.7;
        document.getElementById('set-top-p').value = set.top_p || 0.9;
        document.getElementById('set-hf-token').value = set.hf_token || '';

        document.getElementById('val-temp').textContent = set.temperature || 0.7;
    }

    async function fetchModels() {
        try {
            const res = await fetch('/api/models');
            if (res.ok) {
                state.models = await res.json();
                state.activeModel = state.models.find(m => m.is_active) || state.models[0];
                renderModelsGrid();
                updateChatModelSelect();
                updateDashboardModelCard();
            }
        } catch (err) {
            showToast('Erro ao carregar modelos do servidor', 'error');
        }
    }

    async function fetchPrompts() {
        try {
            const res = await fetch('/api/prompts');
            if (res.ok) {
                state.prompts = await res.json();
                renderPromptsGrid();
            }
        } catch (err) {
            showToast('Erro ao carregar templates de prompts', 'error');
        }
    }

    async function fetchConversations() {
        try {
            const res = await fetch('/api/conversations');
            if (res.ok) {
                state.conversations = await res.json();
                renderConversationsList();
            }
        } catch (err) {
            console.error("Erro ao carregar conversas:", err);
        }
    }

    async function fetchMetricsSummary() {
        try {
            const res = await fetch('/api/metrics/summary');
            if (res.ok) {
                const summary = await res.json();
                document.getElementById('dash-vram-saved').textContent = `${summary.vram_saved_percent}%`;
                document.getElementById('dash-avg-tps').textContent = `${summary.avg_tps} TPS`;
                document.getElementById('dash-total-models').textContent = summary.total_models;

                document.getElementById('vram-mini-value').textContent = `${summary.vram_required_gb} / 8.0 GB`;
                const progressPct = Math.min((summary.vram_required_gb / 8.0) * 100, 100);
                document.getElementById('vram-mini-progress').style.width = `${progressPct}%`;
            }
        } catch (err) {
            console.error("Erro ao carregar resumo de métricas:", err);
        }
    }

    async function fetchDiagnostics() {
        try {
            const res = await fetch('/api/settings/diagnostics');
            if (res.ok) {
                const diag = await res.json();
                document.getElementById('hw-cpu').textContent = diag.os;
                document.getElementById('hw-gpu').textContent = diag.device_name;
                document.getElementById('hw-vram').textContent = `${diag.vram_total_gb} GB`;

                renderDiagnosticsList(diag);
            }
        } catch (err) {
            console.error("Erro ao carregar diagnósticos:", err);
        }
    }

    function renderDiagnosticsList(diag) {
        const container = document.getElementById('diagnostics-list-container');
        if (!container) return;

        container.innerHTML = `
            <div class="diag-item"><span>Sistema Operacional:</span> <strong>${diag.os} (${diag.os_version})</strong></div>
            <div class="diag-item"><span>Python Version:</span> <strong>${diag.python_version}</strong></div>
            <div class="diag-item"><span>Dispositivo CUDA:</span> <strong>${diag.device_name}</strong></div>
            <div class="diag-item"><span>Suporte CUDA Ativo:</span> <strong>${diag.cuda_available ? 'Sim (Hardware Nativo)' : 'Simulação Local AirLLM Engine'}</strong></div>
            <div class="diag-item"><span>Banco de Dados SQLite:</span> <strong>${diag.db_size_kb} KB (${diag.db_path})</strong></div>
            <div class="diag-item"><span>Versão AirLLM:</span> <strong>${diag.airllm_version}</strong></div>
        `;
    }

    function updateDashboardModelCard() {
        if (state.activeModel) {
            document.getElementById('dash-active-model').textContent = state.activeModel.name;
            document.getElementById('dash-model-params').textContent = `${state.activeModel.parameters_billions}B Parâmetros em ${state.activeModel.vram_required_gb}GB VRAM`;
        }
    }

    // ==========================================================================
    // RENDERIZAÇÃO DE MODELOS (CRUD UI)
    // ==========================================================================
    function renderModelsGrid() {
        const container = document.getElementById('models-grid-container');
        if (!container) return;

        if (state.models.length === 0) {
            container.innerHTML = `<div class="empty-state">Nenhum modelo cadastrado no banco de dados.</div>`;
            return;
        }

        container.innerHTML = state.models.map(m => `
            <div class="model-card glassmorphism ${m.is_active ? 'active-card' : ''}">
                <div class="card-header-flex">
                    <div>
                        <h3>${m.name}</h3>
                        <small class="text-muted">${m.hf_repo_id}</small>
                    </div>
                    ${m.is_active ? '<span class="model-badge-active"><i class="fa-solid fa-check"></i> Ativo</span>' : ''}
                </div>

                <p class="model-desc">${m.description || 'Modelo de linguagem de alta capacidade otimizado com AirLLM.'}</p>

                <div class="model-specs">
                    <span><i class="fa-solid fa-microchip"></i> ${m.parameters_billions}B Params</span>
                    <span><i class="fa-solid fa-memory"></i> ${m.vram_required_gb}GB VRAM</span>
                    <span><i class="fa-solid fa-sliders"></i> ${m.compression}</span>
                </div>

                <div class="card-actions">
                    ${!m.is_active ? `<button class="btn btn-outline btn-sm btn-activate-model" data-id="${m.id}"><i class="fa-solid fa-power-off"></i> Ativar</button>` : ''}
                    <button class="btn btn-outline btn-sm btn-edit-model" data-id="${m.id}"><i class="fa-solid fa-pen"></i> Editar</button>
                    <button class="btn btn-outline-danger btn-sm btn-delete-model" data-id="${m.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');

        // Eventos nos botões
        container.querySelectorAll('.btn-activate-model').forEach(b => {
            b.addEventListener('click', () => activateModel(b.getAttribute('data-id')));
        });
        container.querySelectorAll('.btn-edit-model').forEach(b => {
            b.addEventListener('click', () => editModelModal(b.getAttribute('data-id')));
        });
        container.querySelectorAll('.btn-delete-model').forEach(b => {
            b.addEventListener('click', () => deleteModel(b.getAttribute('data-id')));
        });
    }

    async function activateModel(id) {
        try {
            const res = await fetch(`/api/models/${id}/activate`, { method: 'POST' });
            if (res.ok) {
                showToast('Modelo ativado com sucesso!', 'success');
                await fetchModels();
            }
        } catch (err) {
            showToast('Erro ao ativar modelo', 'error');
        }
    }

    async function deleteModel(id) {
        if (!confirm('Deseja realmente excluir este modelo?')) return;
        try {
            const res = await fetch(`/api/models/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Modelo excluído do banco de dados', 'success');
                await fetchModels();
            }
        } catch (err) {
            showToast('Erro ao excluir modelo', 'error');
        }
    }

    // ==========================================================================
    // RENDERIZAÇÃO DE PROMPTS (CRUD UI)
    // ==========================================================================
    function renderPromptsGrid() {
        const container = document.getElementById('prompts-grid-container');
        if (!container) return;

        let filtered = state.prompts;

        if (state.activeCategoryFilter !== 'Todos') {
            filtered = filtered.filter(p => p.category === state.activeCategoryFilter);
        }

        const searchQuery = document.getElementById('search-prompts-input')?.value.toLowerCase();
        if (searchQuery) {
            filtered = filtered.filter(p => p.name.toLowerCase().includes(searchQuery) || (p.tags && p.tags.toLowerCase().includes(searchQuery)));
        }

        if (filtered.length === 0) {
            container.innerHTML = `<div class="empty-state">Nenhum template de prompt localizado.</div>`;
            return;
        }

        container.innerHTML = filtered.map(p => `
            <div class="prompt-card glassmorphism">
                <div class="card-header-flex">
                    <h3>${p.name}</h3>
                    <span class="badge cyan">${p.category}</span>
                </div>
                <p class="prompt-desc">${p.description || ''}</p>
                <div class="prompt-preview">
                    <code>${p.template_content.substring(0, 100)}...</code>
                </div>
                <div class="card-actions">
                    <button class="btn btn-primary btn-sm btn-use-prompt" data-content="${encodeURIComponent(p.template_content)}">
                        <i class="fa-solid fa-paper-plane"></i> Usar no Chat
                    </button>
                    <button class="btn btn-outline btn-sm btn-edit-prompt" data-id="${p.id}">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm btn-delete-prompt" data-id="${p.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.btn-use-prompt').forEach(b => {
            b.addEventListener('click', () => {
                const text = decodeURIComponent(b.getAttribute('data-content'));
                document.getElementById('chat-prompt-input').value = text;
                switchTab('chat');
                showToast('Prompt inserido no Studio Chat!', 'success');
            });
        });

        container.querySelectorAll('.btn-edit-prompt').forEach(b => {
            b.addEventListener('click', () => editPromptModal(b.getAttribute('data-id')));
        });

        container.querySelectorAll('.btn-delete-prompt').forEach(b => {
            b.addEventListener('click', () => deletePrompt(b.getAttribute('data-id')));
        });
    }

    async function deletePrompt(id) {
        if (!confirm('Deseja excluir este template de prompt?')) return;
        try {
            const res = await fetch(`/api/prompts/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Template excluído com sucesso!', 'success');
                await fetchPrompts();
            }
        } catch (err) {
            showToast('Erro ao excluir prompt', 'error');
        }
    }

    // Configurar Filtros e Busca de Prompts
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeCategoryFilter = btn.getAttribute('data-cat');
            renderPromptsGrid();
        });
    });

    document.getElementById('search-prompts-input')?.addEventListener('input', () => {
        renderPromptsGrid();
    });

    // ==========================================================================
    // PLAYGROUND CHAT STUDIO ENGINE
    // ==========================================================================
    function updateChatModelSelect() {
        const select = document.getElementById('chat-model-select');
        if (!select) return;

        select.innerHTML = state.models.map(m => `
            <option value="${m.id}" ${m.is_active ? 'selected' : ''}>${m.name} (${m.parameters_billions}B)</option>
        `).join('');

        if (state.activeModel) {
            document.getElementById('current-chat-model-badge').textContent = `Modelo: ${state.activeModel.name}`;
        }
    }

    function renderConversationsList() {
        const container = document.getElementById('conversations-list');
        if (!container) return;

        if (state.conversations.length === 0) {
            container.innerHTML = `<div class="empty-state-sm">Nenhuma conversa salva.</div>`;
            return;
        }

        container.innerHTML = state.conversations.map(c => `
            <div class="conversation-item ${state.currentConversationId === c.id ? 'active' : ''}" data-id="${c.id}">
                <span class="conv-title"><i class="fa-solid fa-message"></i> ${c.title}</span>
                <i class="fa-solid fa-chevron-right arrow"></i>
            </div>
        `).join('');

        container.querySelectorAll('.conversation-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.getAttribute('data-id'));
                loadConversation(id);
            });
        });
    }

    async function loadConversation(id) {
        state.currentConversationId = id;
        renderConversationsList();

        try {
            const res = await fetch(`/api/conversations/${id}`);
            if (res.ok) {
                const conv = await res.json();
                document.getElementById('current-chat-title').textContent = conv.title;
                
                const messagesContainer = document.getElementById('chat-messages-container');
                messagesContainer.innerHTML = '';

                conv.messages.forEach(msg => {
                    appendMessageBubble(msg.role, msg.content, msg.tokens_per_sec, msg.vram_used_gb);
                });

                scrollToBottomChat();
            }
        } catch (err) {
            showToast('Erro ao carregar mensagens da conversa', 'error');
        }
    }

    function setupChatForm() {
        const form = document.getElementById('form-chat-send');
        const input = document.getElementById('chat-prompt-input');

        // Envio com Enter (sem Shift)
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                form.dispatchEvent(new Event('submit'));
            }
        });

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const promptText = input.value.trim();
            if (!promptText) return;

            input.value = '';
            
            // Exibir mensagem do usuário
            appendMessageBubble('user', promptText);
            scrollToBottomChat();

            // Preparar bolha de resposta do assistente
            const asstBubble = appendMessageBubble('assistant', 'Pensando e processando streaming de camadas AirLLM...');
            const streamBar = document.getElementById('layer-streaming-bar');
            const streamProgress = document.getElementById('stream-layer-progress');
            const streamLayerText = document.getElementById('stream-active-layer');

            if (streamBar) streamBar.style.display = 'block';

            try {
                const selectedModelId = document.getElementById('chat-model-select').value;
                const body = {
                    conversation_id: state.currentConversationId,
                    model_id: parseInt(selectedModelId),
                    prompt: promptText,
                    temperature: parseFloat(state.userSettings.temperature || 0.7)
                };

                const response = await fetch('/api/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                const reader = response.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let assistantText = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const jsonStr = line.replace('data: ', '').trim();
                            if (!jsonStr) continue;

                            const data = JSON.parse(jsonStr);

                            if (data.token) {
                                assistantText += data.token;
                                asstBubble.querySelector('.message-text').textContent = assistantText;
                            }

                            if (data.layer) {
                                const pct = (data.layer / data.total_layers) * 100;
                                if (streamProgress) streamProgress.style.width = `${pct}%`;
                                if (streamLayerText) streamLayerText.textContent = `${data.layer} / ${data.total_layers}`;
                            }

                            if (data.done) {
                                state.currentConversationId = data.conversation_id;
                                await fetchConversations();
                            }

                            scrollToBottomChat();
                        }
                    }
                }
            } catch (err) {
                asstBubble.querySelector('.message-text').textContent = 'Erro durante a inferência de streaming.';
            } finally {
                if (streamBar) streamBar.style.display = 'none';
            }
        });

        // Botão Novo Chat
        document.getElementById('btn-new-chat')?.addEventListener('click', () => {
            state.currentConversationId = null;
            document.getElementById('current-chat-title').textContent = 'Novo Tópico de Inferência';
            document.getElementById('chat-messages-container').innerHTML = `
                <div class="chat-welcome-message">
                    <div class="welcome-icon"><i class="fa-solid fa-brain"></i></div>
                    <h2>AirLLM Studio Executivo</h2>
                    <p>Inicie uma nova conversa de alta precisão com o modelo ativo.</p>
                </div>
            `;
            renderConversationsList();
        });

        // Chips de sugestão
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                input.value = chip.getAttribute('data-prompt');
                form.dispatchEvent(new Event('submit'));
            });
        });
    }

    function appendMessageBubble(role, text, tps = null, vram = null) {
        const container = document.getElementById('chat-messages-container');
        const bubble = document.createElement('div');
        bubble.className = `message-bubble ${role}`;

        let metaHtml = '';
        if (role === 'assistant' && tps) {
            metaHtml = `<div class="message-meta"><span><i class="fa-solid fa-bolt"></i> ${tps} TPS</span> <span><i class="fa-solid fa-memory"></i> ${vram}GB VRAM</span></div>`;
        }

        bubble.innerHTML = `
            <div class="message-text">${text}</div>
            ${metaHtml}
        `;

        container.appendChild(bubble);
        return bubble;
    }

    function scrollToBottomChat() {
        const container = document.getElementById('chat-messages-container');
        if (container) container.scrollTop = container.scrollHeight;
    }

    // ==========================================================================
    // GRÁFICOS (CHART.JS)
    // ==========================================================================
    function initCharts() {
        const ctxVram = document.getElementById('chart-vram-comparison')?.getContext('2d');
        if (ctxVram) {
            state.charts.vram = new Chart(ctxVram, {
                type: 'bar',
                data: {
                    labels: ['Llama 3.1 70B', 'Llama 3.1 405B', 'DeepSeek-V3 671B', 'Kimi K3 2.8T'],
                    datasets: [
                        {
                            label: 'AirLLM Layer Streaming (GB VRAM)',
                            data: [4.0, 8.0, 12.0, 3.72],
                            backgroundColor: 'rgba(0, 242, 254, 0.7)',
                            borderColor: '#00f2fe',
                            borderWidth: 1
                        },
                        {
                            label: 'Carregamento Padrao Sem AirLLM (GB VRAM)',
                            data: [140.0, 810.0, 1340.0, 5600.0],
                            backgroundColor: 'rgba(239, 68, 68, 0.4)',
                            borderColor: '#ef4444',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'logarithmic',
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#94a3b8' }
                        },
                        x: {
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#94a3b8' }
                        }
                    },
                    plugins: {
                        legend: { labels: { color: '#f0f4f8' } }
                    }
                }
            });
        }
    }

    function renderLiveMetricsChart() {
        const ctxLive = document.getElementById('chart-live-metrics')?.getContext('2d');
        if (!ctxLive) return;

        if (state.charts.live) state.charts.live.destroy();

        state.charts.live = new Chart(ctxLive, {
            type: 'line',
            data: {
                labels: ['0s', '5s', '10s', '15s', '20s', '25s', '30s'],
                datasets: [
                    {
                        label: 'VRAM Ativa (GB)',
                        data: [3.8, 4.0, 4.1, 3.9, 4.0, 4.2, 4.0],
                        borderColor: '#00f2fe',
                        backgroundColor: 'rgba(0, 242, 254, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'RAM Sistema (GB)',
                        data: [4.2, 4.5, 4.4, 4.6, 4.5, 4.7, 4.6],
                        borderColor: '#a855f7',
                        backgroundColor: 'rgba(168, 85, 247, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
                },
                plugins: { legend: { labels: { color: '#f0f4f8' } } }
            }
        });
    }

    // ==========================================================================
    // MODAIS E FORMULÁRIOS
    // ==========================================================================
    function setupModals() {
        // Fechar modais pelos botões [data-close]
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = btn.getAttribute('data-close');
                document.getElementById(target)?.classList.remove('show');
            });
        });

        // Modal de Adicionar Modelo
        document.getElementById('btn-open-modal-add-model')?.addEventListener('click', () => {
            document.getElementById('modal-model-title').textContent = 'Cadastrar Novo Modelo HuggingFace';
            document.getElementById('form-model').reset();
            document.getElementById('model-id').value = '';
            document.getElementById('modal-model').classList.add('show');
        });

        // Submit Form Modelo
        document.getElementById('form-model')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('model-id').value;
            const body = {
                name: document.getElementById('model-name').value,
                hf_repo_id: document.getElementById('model-hf-id').value,
                parameters_billions: parseFloat(document.getElementById('model-params').value),
                vram_required_gb: parseFloat(document.getElementById('model-vram').value),
                compression: document.getElementById('model-compression').value,
                description: document.getElementById('model-description').value
            };

            try {
                const url = id ? `/api/models/${id}` : '/api/models';
                const method = id ? 'PUT' : 'POST';

                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (res.ok) {
                    showToast(id ? 'Modelo atualizado com sucesso!' : 'Novo modelo cadastrado com sucesso!', 'success');
                    document.getElementById('modal-model').classList.remove('show');
                    await fetchModels();
                } else {
                    const err = await res.json();
                    showToast(err.detail || 'Erro ao salvar modelo', 'error');
                }
            } catch (err) {
                showToast('Erro ao conectar ao servidor', 'error');
            }
        });

        // Modal Adicionar Prompt
        document.getElementById('btn-open-modal-add-prompt')?.addEventListener('click', () => {
            document.getElementById('modal-prompt-title').textContent = 'Criar Novo Template de Prompt';
            document.getElementById('form-prompt').reset();
            document.getElementById('prompt-id').value = '';
            document.getElementById('modal-prompt').classList.add('show');
        });

        // Submit Form Prompt
        document.getElementById('form-prompt')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('prompt-id').value;
            const body = {
                name: document.getElementById('prompt-name').value,
                category: document.getElementById('prompt-category').value,
                system_prompt: document.getElementById('prompt-system').value,
                template_content: document.getElementById('prompt-content').value,
                tags: document.getElementById('prompt-tags').value
            };

            try {
                const url = id ? `/api/prompts/${id}` : '/api/prompts';
                const method = id ? 'PUT' : 'POST';

                const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (res.ok) {
                    showToast(id ? 'Template atualizado!' : 'Novo template criado!', 'success');
                    document.getElementById('modal-prompt').classList.remove('show');
                    await fetchPrompts();
                }
            } catch (err) {
                showToast('Erro ao salvar template', 'error');
            }
        });

        // Submit Settings Form
        document.getElementById('form-settings')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const body = {
                user_name: document.getElementById('set-user-name').value,
                user_role: document.getElementById('set-user-role').value,
                temperature: parseFloat(document.getElementById('set-temp').value),
                top_p: parseFloat(document.getElementById('set-top-p').value),
                hf_token: document.getElementById('set-hf-token').value
            };

            try {
                const res = await fetch('/api/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });

                if (res.ok) {
                    state.userSettings = await res.json();
                    updateUserSettingsUI();
                    showToast('Configurações salvas com sucesso!', 'success');
                }
            } catch (err) {
                showToast('Erro ao salvar configurações', 'error');
            }
        });
    }

    function editModelModal(id) {
        const m = state.models.find(item => item.id == id);
        if (!m) return;

        document.getElementById('modal-model-title').textContent = 'Editar Modelo HuggingFace';
        document.getElementById('model-id').value = m.id;
        document.getElementById('model-name').value = m.name;
        document.getElementById('model-hf-id').value = m.hf_repo_id;
        document.getElementById('model-params').value = m.parameters_billions;
        document.getElementById('model-vram').value = m.vram_required_gb;
        document.getElementById('model-compression').value = m.compression;
        document.getElementById('model-description').value = m.description || '';

        document.getElementById('modal-model').classList.add('show');
    }

    function editPromptModal(id) {
        const p = state.prompts.find(item => item.id == id);
        if (!p) return;

        document.getElementById('modal-prompt-title').textContent = 'Editar Template de Prompt';
        document.getElementById('prompt-id').value = p.id;
        document.getElementById('prompt-name').value = p.name;
        document.getElementById('prompt-category').value = p.category;
        document.getElementById('prompt-system').value = p.system_prompt || '';
        document.getElementById('prompt-content').value = p.template_content;
        document.getElementById('prompt-tags').value = p.tags || '';

        document.getElementById('modal-prompt').classList.add('show');
    }

    function setupQuickActions() {
        document.getElementById('btn-quick-chat')?.addEventListener('click', () => switchTab('chat'));
        document.getElementById('btn-quick-model')?.addEventListener('click', () => {
            switchTab('models');
            document.getElementById('btn-open-modal-add-model')?.click();
        });
        document.getElementById('btn-quick-prompt')?.addEventListener('click', () => {
            switchTab('prompts');
            document.getElementById('btn-open-modal-add-prompt')?.click();
        });
        document.getElementById('btn-insert-prompt-modal')?.addEventListener('click', () => switchTab('prompts'));
        document.getElementById('btn-refresh-metrics')?.addEventListener('click', () => {
            fetchMetricsSummary();
            fetchDiagnostics();
            showToast('Métricas atualizadas!', 'success');
        });
    }

    // ==========================================================================
    // HELPER DE NOTIFICAÇÕES (TOAST)
    // ==========================================================================
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

        toast.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
});
