from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import requests
import jwt
from datetime import datetime, timedelta
import secrets
from sqlalchemy import func
from functools import wraps
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)
TRIVIA_API_URL = "https://opentdb.com/api.php"


app.config['SECRET_KEY'] = secrets.token_hex(32)  
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL').replace('postgres://', 'postgresql://')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_EXPIRATION_HOURS'] = 5

db = SQLAlchemy(app)

# Models
class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password = db.Column(db.Text, nullable=False)

class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    subject = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    completed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    deadline = db.Column(db.DateTime, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    def to_dict(self):
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}

class PomodoroSession(db.Model):
    __tablename__ = 'pomodoro_sessions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)
    session_type = db.Column(db.String(50), nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "session_type": self.session_type,
            "duration": self.duration,
            "completed_at": self.completed_at.isoformat()
        }

with app.app_context():
    db.create_all()


def create_token(user_id):
    return jwt.encode(
        {
            "user_id": user_id,
            "exp": datetime.utcnow() + timedelta(hours=app.config['JWT_EXPIRATION_HOURS'])
        },
        app.config['SECRET_KEY'],
        algorithm="HS256"
    )

def validate_date(date_str):
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token :
            return jsonify({'error': 'Missing or invalid token'}), 401
        
        try:
            decoded = jwt.decode(token.split()[1], app.config['SECRET_KEY'], algorithms=["HS256"])
            kwargs['user_id'] = decoded['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated

def validate_json(*required_fields):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not request.is_json:
                return jsonify({'error': 'Expected JSON data'}), 415
            
            data = request.get_json()
            missing_fields = [field for field in required_fields if field not in data]
            if missing_fields:
                return jsonify({'error': f'Missing required fields: {", ".join(missing_fields)}'}), 400
            
            kwargs['data'] = data
            return f(*args, **kwargs)
        return decorated
    return decorator


@app.route('/register', methods=['POST'])
@validate_json('email', 'password', 'name')
def register(data):
    try:
        if User.query.filter_by(email=data['email']).first():
            return jsonify({"error": "Email already exists"}), 409

        hashed_password = generate_password_hash(data['password'])
        new_user = User(
            email=data['email'],
            username=data['name'],
            password=hashed_password
        )

        db.session.add(new_user)
        db.session.commit()

        token = create_token(new_user.id)
        return jsonify({"token": token}), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Registration error: {str(e)}")
        return jsonify({"error": "Registration failed"}), 500

@app.route('/login', methods=['POST'])
@validate_json('email', 'password')
def login(data):
    try:
        user = User.query.filter_by(email=data['email']).first()
        if user and check_password_hash(user.password, data['password']):
            token = create_token(user.id)
            return jsonify({"token": token}), 200
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        app.logger.error(f"Login error: {str(e)}")
        return jsonify({"error": "Login failed"}), 500

@app.route("/dashboard", methods=["GET"])
@token_required
def dashboard(user_id):
    try:
        tasks = Task.query.filter_by(user_id=user_id).all()
        subjects = [[task.subject, task.completed, task.title] for task in tasks]
        return jsonify({"subjects": subjects})
    except Exception as e:
        app.logger.error(f"Dashboard error: {str(e)}")
        return jsonify({"error": "Failed to fetch dashboard data"}), 500

@app.route('/task', methods=['POST'])
@token_required
@validate_json('title', 'subject', 'deadline')
def add_goal(user_id, data):
    try:
        deadline_date = validate_date(data['deadline'])
        if not deadline_date:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        if deadline_date < datetime.utcnow().date():
            return jsonify({'error': 'Deadline cannot be in the past'}), 400

        new_task = Task(
            title=data['title'],
            subject=data['subject'],
            description=data.get('description', ''),
            deadline=deadline_date,
            user_id=user_id
        )
        
        db.session.add(new_task)
        db.session.commit()
        return jsonify({'message': 'Goal added', 'goal_id': new_task.id}), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Add goal error: {str(e)}")
        return jsonify({'error': 'Failed to create goal'}), 500

@app.route('/categories', methods=['GET'])
def get_categories():
    try:
        response = requests.get("https://opentdb.com/api_category.php", timeout=5)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Categories API error: {str(e)}")
        return jsonify({"error": "Failed to fetch categories"}), 500

@app.route("/sessions", methods=["POST"])
@token_required
@validate_json('session_type', 'duration')
def save_session(user_id, data):
    try:
        session = PomodoroSession(
            user_id=user_id,
            session_type=data['session_type'],
            duration=data['duration']
        )
        db.session.add(session)
        db.session.commit()
        return jsonify({"message": "Session saved", "session": session.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Save session error: {str(e)}")
        return jsonify({"error": "Failed to save session"}), 500

@app.route("/sessions", methods=["GET"])
@token_required
def get_sessions(user_id):
    try:
        sessions = PomodoroSession.query.filter_by(user_id=user_id)\
            .order_by(PomodoroSession.completed_at.desc()).all()
        return jsonify([s.to_dict() for s in sessions])
    except Exception as e:
        app.logger.error(f"Get sessions error: {str(e)}")
        return jsonify({"error": "Failed to fetch sessions"}), 500

@app.route('/quiz', methods=['GET'])
def get_quiz():
    try:
        params = {
            'amount': request.args.get('amount', default=10, type=int),
            'category': request.args.get('category', default='', type=str),
            'difficulty': request.args.get('difficulty', default='', type=str),
            'type': request.args.get('type', default='', type=str)
        }
        
        response = requests.get(TRIVIA_API_URL, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if data['response_code'] != 0:
            return jsonify({"error": "No results found"}), 404
            
        return jsonify(data)
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Quiz API error: {str(e)}")
        return jsonify({"error": "Failed to fetch quiz"}), 500

@app.route('/task/<date>', methods=['GET'])
@token_required
def get_tasks_by_date(user_id, date):
    try:
        parsed_date = validate_date(date)
        if not parsed_date:
            return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

        tasks = Task.query.filter(
            Task.user_id == user_id,
            func.date(Task.deadline) == parsed_date
        ).all()

        task_list = [
            {
                "id": t.id,
                "text": t.title,
                "completed": t.completed,
                "deadline": t.deadline.isoformat()
            }
            for t in tasks
        ]

        return jsonify({"tasks": task_list})
    except Exception as e:
        app.logger.error(f"Get tasks by date error: {str(e)}")
        return jsonify({"error": "Failed to fetch tasks"}), 500

@app.route('/task/<int:task_id>', methods=['DELETE'])
@token_required
def delete_task(user_id, task_id):
    try:
        task = Task.query.filter_by(id=task_id, user_id=user_id).first()
        if not task:
            return jsonify({'error': 'Task not found'}), 404

        db.session.delete(task)
        db.session.commit()
        return jsonify({'message': 'Task deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Delete task error: {str(e)}")
        return jsonify({"error": "Failed to delete task"}), 500

@app.route('/task/<int:task_id>/complete', methods=['PUT'])
@token_required
def complete_task(user_id, task_id):
    try:
        task = Task.query.filter_by(id=task_id, user_id=user_id).first()
        if not task:
            return jsonify({'error': 'Task not found'}), 404

        task.completed = True
        db.session.commit()
        return jsonify({'message': 'Task marked as complete'}), 200
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Complete task error: {str(e)}")
        return jsonify({"error": "Failed to complete task"}), 500

@app.route('/notifications', methods=['GET'])
@token_required
def get_notifications(user_id):
    try:
        today = datetime.utcnow().date()
        tomorrow = today + timedelta(days=1)

        tasks = Task.query.filter(
            Task.user_id == user_id,
            Task.completed == False
        ).all()

        notifications = []

        for task in tasks:
            deadline = task.deadline.date()
            days_diff = (deadline - today).days

            if deadline < today:
                days_overdue = (today - deadline).days
                notifications.append({
                    "title": task.title,
                    "subject": task.subject,
                    "message": f"⛔ Overdue by {days_overdue} day{'s' if days_overdue != 1 else ''}: {task.title}",
                    "type": "overdue",
                    "days_overdue": days_overdue,
                    "task_id": task.id,
                    "deadline": task.deadline.isoformat()
                })
            elif deadline == today:
                notifications.append({
                    "title": task.title,
                    "subject": task.subject,
                    "message": f"⚠️ Due today: {task.title}",
                    "type": "due_today",
                    "task_id": task.id,
                    "deadline": task.deadline.isoformat()
                })
            elif deadline == tomorrow:
                notifications.append({
                    "title": task.title,
                    "subject": task.subject,
                    "message": f"ℹ️ Due tomorrow: {task.title}",
                    "type": "due_tomorrow",
                    "task_id": task.id,
                    "deadline": task.deadline.isoformat()
                })
            elif 0 < days_diff <= 3:
                notifications.append({
                    "title": task.title,
                    "subject": task.subject,
                    "message": f"ℹ️ Due in {days_diff} day{'s' if days_diff != 1 else ''}: {task.title}",
                    "type": "upcoming",
                    "days_remaining": days_diff,
                    "task_id": task.id,
                    "deadline": task.deadline.isoformat()
                })

        notifications.sort(key=lambda x: (
            0 if x['type'] == 'overdue' else 
            1 if x['type'] == 'due_today' else
            2 if x['type'] == 'due_tomorrow' else 3,
            x.get('days_overdue', float('inf')) if 'days_overdue' in x else x.get('days_remaining', float('inf'))
        ))

        return jsonify({"notifications": notifications}), 200
    except Exception as e:
        app.logger.error(f"Get notifications error: {str(e)}")
        return jsonify({"error": "Failed to fetch notifications"}), 500

@app.route('/api/tasks', methods=['GET'])
@token_required
def get_tasks(user_id):
    try:
        start_date = request.args.get('start')
        end_date = request.args.get('end')

        query = Task.query.filter_by(user_id=user_id)
        
        if start_date:
            start_date = validate_date(start_date)
            if not start_date:
                return jsonify({'error': 'Invalid start date format'}), 400
            query = query.filter(Task.deadline >= start_date)
            
        if end_date:
            end_date = validate_date(end_date)
            if not end_date:
                return jsonify({'error': 'Invalid end date format'}), 400
            query = query.filter(Task.deadline <= end_date)
            
        tasks = query.all()

        tasks_data = [{
            'id': task.id,
            'title': task.title,
            'subject': task.subject,
            'completed': task.completed,
            'deadline': task.deadline.isoformat(),
            'created_at': task.created_at.isoformat()
        } for task in tasks]
        
        return jsonify(tasks_data)
    except Exception as e:
        app.logger.error(f"Get tasks error: {str(e)}")
        return jsonify({'error': 'Failed to fetch tasks'}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8000)