import pandas as pd
import os
import warnings
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import pickle

# Suppress common data science warnings
warnings.filterwarnings('ignore', category=UserWarning)
warnings.filterwarnings('ignore', category=FutureWarning)

class RagService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RagService, cls).__new__(cls)
            cls._instance.initialized = False
        return cls._instance

    def __init__(self):
        if self.initialized:
            return
            
        self.data_path = os.path.join(os.path.dirname(__file__), "data")
        self.vectorizer = TfidfVectorizer(stop_words='english')
        self.queries = []
        self.responses = []
        self.tfidf_matrix = None
        self.load_data()
        self.initialized = True

    def load_data(self):
        """Loads train.csv and creates query-response pairs"""
        cache_path = os.path.join(self.data_path, "rag_cache.pkl")
        if os.path.exists(cache_path):
            print("RAG Service: Loading from fast cache (skipping slow vectorization)...")
            try:
                with open(cache_path, 'rb') as f:
                    data = pickle.load(f)
                    self.vectorizer = data['vectorizer']
                    self.queries = data['queries']
                    self.responses = data['responses']
                    self.tfidf_matrix = data['matrix']
                print("RAG Service: Ready.")
                return
            except Exception as e:
                print(f"RAG Service: Failed to load cache, rebuilding... {e}")
                pass

        print("RAG Service: Building dataset and vectors from scratch...")
        try:
            train_path = os.path.join(self.data_path, "train.csv")
            valid_path = os.path.join(self.data_path, "valid.csv")
            
            dfs = []
            if os.path.exists(train_path):
                # on_bad_lines='skip' ensures we don't crash on malformed rows
                dfs.append(pd.read_csv(train_path, dtype=str, on_bad_lines='skip'))
            if os.path.exists(valid_path):
                dfs.append(pd.read_csv(valid_path, dtype=str, on_bad_lines='skip'))
                
            if not dfs:
                print("RAG Service: No data files found.")
                return

            df = pd.concat(dfs, ignore_index=True)
            
            # Convert indices to numeric for sorting
            df['conv_id'] = df['conv_id'].astype(str)
            df['utterance_idx'] = pd.to_numeric(df['utterance_idx'], errors='coerce')
            
            # Sort to ensure conversation order
            df = df.sort_values(by=['conv_id', 'utterance_idx'])
            
            # Extract pairs
            # We assume speaker_idx changes between 0 and 1. 
            # We want pairs where we can map a statement to a response.
            
            # Method: Iterate and find pairs where conv_id matches and utterance_idx follows
            # This is slow, so we can shift the dataframe
            
            df_next = df.shift(-1)
            
            # Filter condition: 
            # 1. Same conversation
            # 2. Next utterance index = Current + 1
            # 3. Current is "User" (let's assume random/any speaker prompting an answer)
            
            valid_pairs = (df['conv_id'] == df_next['conv_id']) & \
                          (df['utterance_idx'] + 1 == df_next['utterance_idx'])
            
            input_texts = df[valid_pairs]['utterance'].tolist()
            target_texts = df_next[valid_pairs]['utterance'].tolist()
            
            # Clean data
            self.queries = [str(q).replace('_comma_', ',') for q in input_texts]
            self.responses = [str(r).replace('_comma_', ',') for r in target_texts]
            
            # Optimization: Limit size if too big for immediate memory (e.g., take 50k recent or random)
            # For now, we take all (~100k isn't too huge for simple TF-IDF in memory approx 50-100MB)
            
            print(f"RAG Service: Vectorizing {len(self.queries)} pairs...")
            self.tfidf_matrix = self.vectorizer.fit_transform(self.queries)
            
            print("RAG Service: Caching results to disk for faster future startups...")
            with open(cache_path, 'wb') as f:
                pickle.dump({
                    'vectorizer': self.vectorizer,
                    'queries': self.queries,
                    'responses': self.responses,
                    'matrix': self.tfidf_matrix
                }, f)
            print("RAG Service: Ready.")
            
        except Exception as e:
            print(f"RAG Service Error: {e}")

    def find_relevant_context(self, user_query: str, threshold: float = 0.3) -> dict:
        """SearchResults: {'context_query': ..., 'context_response': ..., 'similarity': ...} or None"""
        if self.tfidf_matrix is None or not self.queries:
            return None
            
        try:
            query_vec = self.vectorizer.transform([user_query])
            cosine_similarities = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
            
            best_idx = np.argmax(cosine_similarities)
            best_score = cosine_similarities[best_idx]
            
            if best_score >= threshold:
                return {
                    "matched_user_msg": self.queries[best_idx],
                    "matched_bot_response": self.responses[best_idx],
                    "similarity": float(best_score)
                }
        except Exception as e:
            print(f"RAG Search Error: {e}")
            
        return None

# Global instance
rag_system = RagService()
