// Главный объект приложения
const PlayableDashboard = {
    data: {
        farm: [],
        city: []
    },

    // Инициализация приложения
    async init() {
        await this.loadPlayables();
        this.renderPlayables();
    },

    // Загрузка данных из JSON файлов
    async loadPlayables() {
        try {
            // Загружаем из JSON файлов
            const [farmResponse, cityResponse] = await Promise.all([
                fetch('data/farm-playables.json'),
                fetch('data/city-playables.json')
            ]);

            this.data.farm = await farmResponse.json();
            this.data.city = await cityResponse.json();
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback пустые данные если файлы не загрузились
            this.data = {
                farm: [],
                city: []
            };
        }
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
                    ${!playable.screenshot ? '<div class="screenshot-placeholder">📱<br>No preview</div>' : ''}
                </div>
                
                <div class="playable-actions">
                    <a href="${playable.playUrl}" target="_blank" class="btn btn-play">
                        ▶ Play
                    </a>
                </div>
            </div>
        `;
    },

    // Рендер плейблов
    renderPlayables() {
        // Render Farm playables
        const farmContainer = document.getElementById('farm-playables');
        farmContainer.innerHTML = this.data.farm.map(playable => 
            this.createPlayableCard(playable, 'farm')
        ).join('');

        // Render City playables
        const cityContainer = document.getElementById('city-playables');
        cityContainer.innerHTML = this.data.city.map(playable => 
            this.createPlayableCard(playable, 'city')
        ).join('');
    }
};

// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    PlayableDashboard.init();
});