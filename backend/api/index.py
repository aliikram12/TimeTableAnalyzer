import sys
import os

# Add the backend root to sys.path so all modules are importable on Vercel
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
