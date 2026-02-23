import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns

# Set style for IEEE paper (white background, professional fonts)
plt.style.use('default')
plt.rcParams['font.family'] = 'serif'
plt.rcParams['font.serif'] = ['Times New Roman']
plt.rcParams['font.size'] = 12

def generate_confusion_matrix():
    """Generates Figure 2: Confusion Matrix Heatmap"""
    # Data from your results
    # Classes: Anger, Depression, Anxiety, Neutral, Joy
    # Values represent normalized accuracy percentages (0.0 to 1.0)
    cm_data = np.array([
        [0.91, 0.02, 0.05, 0.02, 0.00], # Anger
        [0.03, 0.86, 0.06, 0.05, 0.00], # Depression
        [0.04, 0.08, 0.82, 0.02, 0.04], # Anxiety (Confused often with Joy/Depression)
        [0.01, 0.03, 0.02, 0.94, 0.00], # Neutral
        [0.00, 0.01, 0.06, 0.01, 0.92]  # Joy
    ])
    
    classes = ['Anger', 'Depression', 'Anxiety', 'Neutral', 'Joy']

    plt.figure(figsize=(6, 5))
    sns.heatmap(cm_data, annot=True, cmap='Blues', fmt='.2f', 
                xticklabels=classes, yticklabels=classes, cbar=False)
    
    plt.title('Emotion Recognition Confusion Matrix', pad=20)
    plt.ylabel('Ground Truth')
    plt.xlabel('Predicted Class')
    plt.tight_layout()
    
    filename = "fig2_confusion_matrix.png"
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    print(f"Generated {filename}")

def generate_latency_bar_chart():
    """Generates an optional chart for Latency Breakdown"""
    stages = ['STT', 'RAG Retrieval', 'LLM Generation', 'TTS Synthesis']
    times = [320, 150, 800, 450] # milliseconds
    
    plt.figure(figsize=(6, 4))
    bars = plt.bar(stages, times, color=['#4a90e2', '#50e3c2', '#b8e986', '#bd10e0'], width=0.6)
    
    # Add values on top
    for bar in bars:
        yval = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2, yval + 10, f"{yval}ms", ha='center', va='bottom')

    plt.title('System Latency Breakdown (End-to-End)', pad=20)
    plt.ylabel('Time (ms)')
    plt.ylim(0, 1000)
    plt.grid(axis='y', linestyle='--', alpha=0.7)
    plt.tight_layout()
    
    filename = "latency_chart.png"
    plt.savefig(filename, dpi=300, bbox_inches='tight')
    print(f"Generated {filename}")

if __name__ == "__main__":
    generate_confusion_matrix()
    generate_latency_bar_chart()
