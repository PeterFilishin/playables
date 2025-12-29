// Главный объект приложения
const PlayableDashboard = {
    data: {
        west: [],
        mega: []
    },

    // Инициализация приложения
    async init() {
        await this.loadPlayables();
        this.renderPlayables();
        this.setupEventListeners();
    },

    // Загрузка данных из JSON файлов
    async loadPlayables() {
        try {
            // Проверяем localStorage на предмет кастомных данных
            const savedData = JSON.parse(localStorage.getItem('playablesData'));
            
            if (savedData) {
                this.data = savedData;
            } else {
                // Загружаем из JSON файлов
                const [westResponse, megaResponse] = await Promise.all([
                    fetch('data/west-playables.json'),
                    fetch('data/mega-playables.json')
                ]);

                this.data.west = await westResponse.json();
                this.data.mega = await megaResponse.json();
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            // Fallback данные если файлы не загрузились
            this.data = this.getFallbackData();
        }
    },

    // Резервные данные
    getFallbackData() {
        return {
            west: [
                {
                    title: "west_playable_001",
                    playUrl: "playables/west/west_playable_001.html",
                    asanaUrl: "https://app.asana.com/1/81858279340969/project/957140386061758/task/943954097432365?focus=true",
                    screenshot: "playables/west/screens/west_playable_001.png"
                }
            ],
            mega: [
                {
                    title: "mega_playable_001",
                    playUrl: "playables/mega/mega_playable_001.html",
                    asanaUrl: "https://app.asana.com/1/81858279340969/project/957140386061758/task/1124095372120128?focus=true",
                    screenshot: "playables/mega/screens/mega_playable_001.png"
                }
            ]
        };
    },

    // Создание карточки плейбла
    createPlayableCard(playable, group) {
        const screenshotStyle = playable.screenshot ? 
            `background-image: url('${playable.screenshot}')` : 
            '';
        
        return `
            <div class="playable-card ${group}-card">
                <h3 class="playable-title">${playable.title}</h3>
                
                <div class="playable-screenshot" style="${screenshotStyle}">
                    ${!playable.screenshot ? '<div class="screenshot-placeholder">📱<br>Скриншот недоступен</div>' : ''}
                </div>
                
                <div class="playable-actions">
                    <a href="${playable.playUrl}" target="_blank" class="btn btn-play">
                        Играть
                    </a>
                    <a href="${playable.asanaUrl}" target="_blank" class="btn btn-asana">
                        Asana
                    </a>
                </div>
            </div>
        `;
    },

    // Переключение секций
    toggleSection(sectionName) {
        const content = document.getElementById(`${sectionName}-content`);
        const toggle = document.getElementById(`${sectionName}-toggle`);
        
        if (content.classList.contains('collapsed')) {
            // Разворачиваем
            content.classList.remove('collapsed');
            toggle.classList.remove('collapsed');
            toggle.textContent = '▼';
        } else {
            // Сворачиваем
            content.classList.add('collapsed');
            toggle.classList.add('collapsed');
            toggle.textContent = '▶';
        }
    },

    // Рендер плейблов
    renderPlayables() {
        // Render West playables
        const westContainer = document.getElementById('west-playables');
        westContainer.innerHTML = this.data.west.map(playable => 
            this.createPlayableCard(playable, 'west')
        ).join('');

        // Render Mega playables
        const megaContainer = document.getElementById('mega-playables');
        megaContainer.innerHTML = this.data.mega.map(playable => 
            this.createPlayableCard(playable, 'mega')
        ).join('');

        // Update counts
        document.getElementById('west-count').textContent = 
            `${this.data.west.length} плейбл${this.getPlural(this.data.west.length)}`;
        document.getElementById('mega-count').textContent = 
            `${this.data.mega.length} плейбл${this.getPlural(this.data.mega.length)}`;
    },

    // Склонения слова "плейбл"
    getPlural(count) {
        if (count === 1) return '';
        if (count < 5) return 'а';
        return 'ов';
    },

    // Открытие модала
    openModal() {
        document.getElementById('modal').classList.add('active');
    },

    // Закрытие модала
    closeModal() {
        document.getElementById('modal').classList.remove('active');
        document.getElementById('playableForm').reset();
        document.getElementById('screenshotPreview').style.display = 'none';
    },

    // Добавление нового плейбла
    addPlayable(type, title, playableFile, screenshotFile, asanaUrl) {
        // Создаем URL для файлов (в реальном проекте здесь была бы загрузка на сервер)
        const playableUrl = `playables/${type}/${title}.html`;
        const screenshotUrl = `playables/${type}/screens/${title}.png`;

        // Добавляем новый плейбл в начало массива (инверсный порядок)
        const newPlayable = {
            title: title,
            playUrl: playableUrl,
            asanaUrl: asanaUrl,
            screenshot: screenshotUrl
        };

        this.data[type].unshift(newPlayable); // unshift добавляет в начало

        // Сохраняем в localStorage
        localStorage.setItem('playablesData', JSON.stringify(this.data));

        // Обновляем отображение
        this.renderPlayables();

        // Закрываем модал
        this.closeModal();

        alert(`Плейбл "${title}" успешно добавлен!\n\nВажно: Не забудьте загрузить файлы на сервер:\n- ${playableUrl}\n- ${screenshotUrl}`);
    },

    // Настройка обработчиков событий
    setupEventListeners() {
        // Превью скриншота
        document.getElementById('screenshotFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('previewImage').src = e.target.result;
                    document.getElementById('screenshotPreview').style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        // Обработка формы
        document.getElementById('playableForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const type = document.getElementById('playableType').value;
            const title = document.getElementById('playableTitle').value;
            const playableFile = document.getElementById('playableFile').files[0];
            const screenshotFile = document.getElementById('screenshotFile').files[0];
            const asanaUrl = document.getElementById('asanaUrl').value;

            if (!type || !title || !playableFile || !screenshotFile || !asanaUrl) {
                alert('Пожалуйста, заполните все поля');
                return;
            }

            this.addPlayable(type, title, playableFile, screenshotFile, asanaUrl);
        });

        // Закрытие модала по клику вне его
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });
    }
};

// Глобальные функции для совместимости с HTML
function toggleSection(sectionName) {
    PlayableDashboard.toggleSection(sectionName);
}

function openModal() {
    PlayableDashboard.openModal();
}

function closeModal() {
    PlayableDashboard.closeModal();
}

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    PlayableDashboard.init();
});