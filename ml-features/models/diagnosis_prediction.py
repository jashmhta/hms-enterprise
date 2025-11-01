import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import joblib
import json
from typing import Dict, List, Tuple, Any

class DiagnosisPredictionModel:
    def __init__(self):
        self.models = {
            'random_forest': RandomForestClassifier(n_estimators=100, random_state=42),
            'gradient_boost': GradientBoostingClassifier(n_estimators=100, random_state=42),
            'logistic_regression': LogisticRegression(random_state=42, max_iter=1000)
        }
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.feature_importance = {}
        self.best_model = None
        self.model_performance = {}

    def preprocess_data(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
        """Preprocess the medical data for training"""
        # Handle missing values
        numeric_columns = data.select_dtypes(include=[np.number]).columns
        data[numeric_columns] = data[numeric_columns].fillna(data[numeric_columns].median())
        
        categorical_columns = data.select_dtypes(include=['object']).columns
        for col in categorical_columns:
            if col != 'diagnosis':
                data[col] = data[col].fillna('Unknown')
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                data[col] = self.label_encoders[col].fit_transform(data[col])
            else:
                # Encode target variable
                diagnosis_encoder = LabelEncoder()
                data[col] = diagnosis_encoder.fit_transform(data[col])
                self.label_encoders['diagnosis'] = diagnosis_encoder

        # Separate features and target
        X = data.drop('diagnosis', axis=1)
        y = data['diagnosis']
        
        # Scale numeric features
        X_scaled = self.scaler.fit_transform(X)
        
        return X_scaled, y

    def train(self, data: pd.DataFrame, test_size: float = 0.2) -> Dict[str, Any]:
        """Train multiple models and select the best one"""
        X, y = self.preprocess_data(data)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42, stratify=y
        )
        
        # Train and evaluate each model
        best_score = 0
        results = {}
        
        for name, model in self.models.items():
            # Train model
            model.fit(X_train, y_train)
            
            # Make predictions
            y_pred = model.predict(X_test)
            
            # Calculate metrics
            accuracy = accuracy_score(y_test, y_pred)
            cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
            
            self.model_performance[name] = {
                'accuracy': accuracy,
                'cv_mean': cv_scores.mean(),
                'cv_std': cv_scores.std(),
                'classification_report': classification_report(y_test, y_pred, output_dict=True)
            }
            
            if accuracy > best_score:
                best_score = accuracy
                self.best_model = model
            
            # Store feature importance for tree-based models
            if hasattr(model, 'feature_importances_'):
                self.feature_importance[name] = dict(zip(
                    data.drop('diagnosis', axis=1).columns,
                    model.feature_importances_
                ))
        
        results['best_model'] = type(self.best_model).__name__
        results['best_accuracy'] = best_score
        results['model_performance'] = self.model_performance
        
        return results

    def predict(self, patient_data: Dict[str, Any], top_k: int = 5) -> List[Dict[str, Any]]:
        """Predict diagnosis for a new patient"""
        if self.best_model is None:
            raise ValueError("Model not trained yet. Call train() first.")
        
        # Convert to DataFrame
        df = pd.DataFrame([patient_data])
        
        # Preprocess using same transformers
        for col, encoder in self.label_encoders.items():
            if col != 'diagnosis' and col in df.columns:
                df[col] = encoder.transform(df[col])
        
        # Ensure all columns are present
        expected_columns = [col for col in self.label_encoders.keys() if col != 'diagnosis']
        for col in expected_columns:
            if col not in df.columns:
                df[col] = 0
        
        # Scale features
        X_scaled = self.scaler.transform(df[expected_columns])
        
        # Get prediction probabilities
        if hasattr(self.best_model, 'predict_proba'):
            probabilities = self.best_model.predict_proba(X_scaled)[0]
            classes = self.best_model.classes_
            
            # Get top-k predictions
            top_indices = np.argsort(probabilities)[::-1][:top_k]
            
            # Convert back to original labels
            diagnosis_encoder = self.label_encoders['diagnosis']
            predictions = []
            
            for idx in top_indices:
                diagnosis = diagnosis_encoder.inverse_transform([classes[idx]])[0]
                confidence = probabilities[idx]
                
                predictions.append({
                    'diagnosis': diagnosis,
                    'confidence': float(confidence),
                    'probability': float(probabilities[idx])
                })
        else:
            # For models without predict_proba
            prediction = self.best_model.predict(X_scaled)[0]
            diagnosis_encoder = self.label_encoders['diagnosis']
            diagnosis = diagnosis_encoder.inverse_transform([prediction])[0]
            
            predictions = [{
                'diagnosis': diagnosis,
                'confidence': 1.0,
                'probability': 1.0
            }]
        
        return predictions

    def get_feature_importance(self, model_name: str = None) -> Dict[str, float]:
        """Get feature importance for the specified model or best model"""
        if model_name is None:
            model_name = type(self.best_model).__name__.lower()
        
        if model_name in self.feature_importance:
            return self.feature_importance[model_name]
        
        return {}

    def save_model(self, filepath: str):
        """Save the trained model and preprocessors"""
        model_data = {
            'best_model': self.best_model,
            'scaler': self.scaler,
            'label_encoders': self.label_encoders,
            'feature_importance': self.feature_importance,
            'model_performance': self.model_performance
        }
        joblib.dump(model_data, filepath)

    def load_model(self, filepath: str):
        """Load a trained model and preprocessors"""
        model_data = joblib.load(filepath)
        self.best_model = model_data['best_model']
        self.scaler = model_data['scaler']
        self.label_encoders = model_data['label_encoders']
        self.feature_importance = model_data['feature_importance']
        self.model_performance = model_data['model_performance']

    def explain_prediction(self, patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Explain the prediction for a patient using feature importance"""
        if self.best_model is None:
            raise ValueError("Model not trained yet.")
        
        # Get feature importance
        importance = self.get_feature_importance()
        
        # Get prediction
        predictions = self.predict(patient_data, top_k=1)
        
        # Create explanation
        explanation = {
            'prediction': predictions[0] if predictions else None,
            'feature_importance': importance,
            'key_factors': []
        }
        
        # Sort features by importance and get top factors
        if importance:
            sorted_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)
            explanation['key_factors'] = sorted_features[:5]
        
        return explanation

# Usage example
if __name__ == "__main__":
    # Initialize model
    model = DiagnosisPredictionModel()
    
    # Sample training data (in real scenario, this would come from EHR)
    sample_data = {
        'age': [45, 32, 67, 28, 55],
        'gender': ['M', 'F', 'M', 'F', 'M'],
        'symptoms': ['fever,cough', 'headache', 'chest_pain', 'fever', 'fatigue'],
        'blood_pressure': ['140/90', '120/80', '160/100', '130/85', '150/95'],
        'heart_rate': [90, 75, 110, 85, 95],
        'temperature': [38.5, 37.0, 37.2, 38.0, 36.8],
        'diagnosis': ['flu', 'migraine', 'hypertension', 'viral_infection', 'diabetes']
    }
    
    df = pd.DataFrame(sample_data)
    
    # Train model
    results = model.train(df)
    print("Training results:", results)
    
    # Save model
    model.save_model('diagnosis_model.joblib')
    
    # Make prediction
    patient = {
        'age': 40,
        'gender': 'M',
        'symptoms': 'fever,cough',
        'blood_pressure': '135/88',
        'heart_rate': 88,
        'temperature': 38.2
    }
    
    prediction = model.predict(patient, top_k=3)
    print("Predictions:", prediction)
    
    # Explain prediction
    explanation = model.explain_prediction(patient)
    print("Explanation:", explanation)