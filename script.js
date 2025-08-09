class GAARefereeCalculator {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.loadRecentCalculations();
        
        // Register service worker if supported
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(console.error);
        }
    }

    initializeElements() {
        this.startTimeInput = document.getElementById('start-time-input');
        this.elapsedHoursInput = document.getElementById('elapsed-hours');
        this.elapsedMinutesInput = document.getElementById('elapsed-minutes');
        this.elapsedSecondsInput = document.getElementById('elapsed-seconds');
        this.calculateBtn = document.getElementById('calculate-btn');
        this.resultSection = document.getElementById('result-section');
        this.resultStartTime = document.getElementById('result-start-time');
        this.resultEndTime = document.getElementById('result-end-time');
        this.resultDuration = document.getElementById('result-duration');
        this.copyResultBtn = document.getElementById('copy-result-btn');
        this.saveCalculationBtn = document.getElementById('save-calculation-btn');
        this.calculationsListEl = document.getElementById('calculations-list');
        this.clearCalculationsBtn = document.getElementById('clear-calculations');
    }

    bindEvents() {
        this.calculateBtn.addEventListener('click', () => this.calculateEndTime());
        this.copyResultBtn.addEventListener('click', () => this.copyResult());
        this.saveCalculationBtn.addEventListener('click', () => this.saveCalculation());
        this.clearCalculationsBtn.addEventListener('click', () => this.clearCalculations());
        
        // Auto-calculate when inputs change
        [this.startTimeInput, this.elapsedHoursInput, this.elapsedMinutesInput, this.elapsedSecondsInput].forEach(input => {
            input.addEventListener('input', () => {
                if (this.startTimeInput.value) {
                    this.calculateEndTime();
                }
            });
        });
    }

    formatTimeShort(date) {
        return date.toLocaleTimeString('en-IE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }

    formatDate(date) {
        return date.toLocaleDateString('en-IE', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    formatDuration(hours, minutes, seconds) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    calculateEndTime() {
        const startTimeValue = this.startTimeInput.value;
        const hours = parseInt(this.elapsedHoursInput.value) || 0;
        const minutes = parseInt(this.elapsedMinutesInput.value) || 0;
        const seconds = parseInt(this.elapsedSecondsInput.value) || 0;

        if (!startTimeValue) {
            this.resultSection.style.display = 'none';
            return;
        }

        // Parse start time
        const [startHour, startMinute] = startTimeValue.split(':').map(Number);
        const today = new Date();
        const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMinute);

        // Calculate end time
        const totalElapsedMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
        const endTime = new Date(startTime.getTime() + totalElapsedMs);

        // Update display
        this.resultStartTime.textContent = this.formatTimeShort(startTime);
        this.resultEndTime.textContent = this.formatTimeShort(endTime);
        this.resultDuration.textContent = this.formatDuration(hours, minutes, seconds);

        this.resultSection.style.display = 'block';

        // Store current calculation
        this.currentCalculation = {
            startTime: startTime,
            endTime: endTime,
            duration: { hours, minutes, seconds }
        };
    }

    async copyResult() {
        if (!this.currentCalculation) return;
        
        const startTime = this.formatTimeShort(this.currentCalculation.startTime);
        const endTime = this.formatTimeShort(this.currentCalculation.endTime);
        const duration = this.formatDuration(
            this.currentCalculation.duration.hours,
            this.currentCalculation.duration.minutes,
            this.currentCalculation.duration.seconds
        );
        const date = this.formatDate(this.currentCalculation.startTime);
        
        const text = `GAA Match Report - ${date}
Match Started: ${startTime}
Match Ended: ${endTime}
Total Duration: ${duration}`;

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            
            // Visual feedback
            this.copyResultBtn.textContent = 'Copied!';
            this.copyResultBtn.classList.add('btn-success-flash');
            
            setTimeout(() => {
                this.copyResultBtn.textContent = 'Copy for Report';
                this.copyResultBtn.classList.remove('btn-success-flash');
            }, 2000);
            
            // Haptic feedback if supported
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy calculation. Please try again.');
        }
    }

    saveCalculation() {
        if (!this.currentCalculation) return;
        
        const calculations = this.getStoredCalculations();
        const calculationData = {
            id: Date.now(),
            startTime: this.currentCalculation.startTime.toISOString(),
            endTime: this.currentCalculation.endTime.toISOString(),
            duration: this.currentCalculation.duration,
            date: this.currentCalculation.startTime.toISOString().split('T')[0]
        };
        
        calculations.unshift(calculationData);
        
        // Keep only the last 10 calculations
        if (calculations.length > 10) {
            calculations.splice(10);
        }
        
        localStorage.setItem('gaa-referee-calculations', JSON.stringify(calculations));
        this.loadRecentCalculations();
        
        // Visual feedback
        this.saveCalculationBtn.textContent = 'Saved!';
        this.saveCalculationBtn.classList.add('btn-success-flash');
        
        setTimeout(() => {
            this.saveCalculationBtn.textContent = 'Save Calculation';
            this.saveCalculationBtn.classList.remove('btn-success-flash');
        }, 1500);
        
        // Haptic feedback if supported
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    }

    getStoredCalculations() {
        try {
            const stored = localStorage.getItem('gaa-referee-calculations');
            return stored ? JSON.parse(stored) : [];
        } catch (err) {
            console.error('Error loading stored calculations:', err);
            return [];
        }
    }

    loadRecentCalculations() {
        const calculations = this.getStoredCalculations();
        
        if (calculations.length === 0) {
            this.calculationsListEl.innerHTML = '<div class="empty-state">No recent calculations</div>';
            return;
        }
        
        this.calculationsListEl.innerHTML = calculations.map(calc => {
            const startTime = new Date(calc.startTime);
            const endTime = new Date(calc.endTime);
            const duration = this.formatDuration(calc.duration.hours, calc.duration.minutes, calc.duration.seconds);
            
            return `
                <div class="calculation-item">
                    <div class="calculation-date">${this.formatDate(startTime)}</div>
                    <div class="calculation-times">
                        ${this.formatTimeShort(startTime)} → <span class="calculation-end-time">${this.formatTimeShort(endTime)}</span> (${duration})
                    </div>
                </div>
            `;
        }).join('');
    }

    clearCalculations() {
        if (confirm('Are you sure you want to clear all calculation history?')) {
            localStorage.removeItem('gaa-referee-calculations');
            this.loadRecentCalculations();
            
            // Haptic feedback if supported
            if (navigator.vibrate) {
                navigator.vibrate(100);
            }
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GAARefereeCalculator();
});

// Handle PWA installation
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
});

// Handle app installation
window.addEventListener('appinstalled', (evt) => {
    console.log('GAA Referee Timer installed successfully');
});
