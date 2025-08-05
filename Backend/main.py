from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta, date
import secrets
from sqlalchemy import func



app = Flask(__name__)
CORS(app)  

app.config['SECRET_KEY'] = secrets.token_hex(16)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:admin@localhost:5432/students'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
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

# Initialize DB
with app.app_context():
    db.create_all()


def create_token(user_id):
    return jwt.encode(
        {
            "user_id": user_id,
            "exp": datetime.utcnow() + timedelta(hours=5)
        },
        app.config['SECRET_KEY'],
        algorithm="HS256"
    )

# Registration 
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or not all(k in data for k in ('email', 'password', 'name')):
        return jsonify({"error": "Email, username, and password required"}), 400

    if User.query.filter_by(email=data['email']).first() or User.query.filter_by(username=data['name']).first():
        return jsonify({"error": "Email or username already exists"}), 409

    hashed_password = generate_password_hash(data['password'])
    new_user = User(email=data['email'], username=data['name'], password=hashed_password)

    db.session.add(new_user)
    db.session.commit()

    token = create_token(new_user.id)
    return jsonify({"token": token}), 201

# Login 
@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(email=data.get('email')).first()
    if user and check_password_hash(user.password, data.get('password')):
        token = create_token(user.id)
        return jsonify({"token": token}), 200
    return jsonify({"error": "Invalid credentials"}), 401


@app.route("/dashboard", methods=["GET"])
def dashboard():
    data = {
        "subjects" : [],
    }
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid token"}), 401

    try:
        decoded = jwt.decode(token.split()[1], app.config['SECRET_KEY'], algorithms=["HS256"])
        user_id = decoded["user_id"]
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    tasks = Task.query.filter_by(user_id=user_id).all()
    dict_tasks = [task.to_dict() for task in tasks]

    for task in dict_tasks :
        data["subjects"].append([task["subject"], task["completed"], task["title"]])


    return jsonify(data)


    


@app.route('/task', methods=['POST'])
def add_goal():
    if not request.is_json:
        return jsonify({'error': 'Expected JSON data'}), 415

    data = request.get_json()
    required_fields = ['title', 'subject', 'deadline']
    if any(not data.get(field) for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400

    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Missing token'}), 401

    try:
        decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        user_id = decoded['user_id']
    except jwt.ExpiredSignatureError:
        return jsonify({'error': 'Token expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401

    try:
        deadline_date = datetime.strptime(data['deadline'], '%Y-%m-%d')
        if deadline_date.date() < datetime.utcnow().date():
            return jsonify({'error': 'Deadline cannot be in the past'}), 400
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    try:
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
        app.logger.error(f"Error adding goal: {str(e)}")
        return jsonify({'error': 'Failed to create goal'}), 500


@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "Flask API running"}), 200


@app.route('/task/<date>', methods=['GET'])
def get_tasks_by_date(date):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Missing token'}), 401

    try:
        decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        user_id = decoded['user_id']
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401

    try:
        parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    # Query only tasks for the specific date and user
    tasks = Task.query.filter(
        Task.user_id == user_id,
        func.date(Task.deadline) == parsed_date
    ).all()

    task_list = [
        {
            "id": t.id,
            "text": t.title,
            "completed": t.completed,
            "deadline": t.deadline.isoformat()  # Full ISO format including time if needed
        }
        for t in tasks
    ]

    return jsonify({"tasks": task_list})


@app.route('/task/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Missing token'}), 401

    try:
        decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        user_id = decoded['user_id']
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401

    task = Task.query.filter_by(id=task_id, user_id=user_id).first()
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted successfully'}), 200


@app.route('/task/<int:task_id>/complete', methods=['PUT'])
def complete_task(task_id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'error': 'Missing token'}), 401

    try:
        decoded = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        user_id = decoded['user_id']
    except jwt.InvalidTokenError:
        return jsonify({'error': 'Invalid token'}), 401

    task = Task.query.filter_by(id=task_id, user_id=user_id).first()
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    task.completed = True
    db.session.commit()
    return jsonify({'message': 'Task marked as complete'}), 200

@app.route('/api/tasks')
def get_tasks():
    try:

        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'error': 'Unauthorized'}), 401
            
        try:
            decoded = jwt.decode(token.split()[1], app.config['SECRET_KEY'], algorithms=["HS256"])
            user_id = decoded['user_id']
        except:
            return jsonify({'error': 'Invalid token'}), 401

        start_date = request.args.get('start')
        end_date = request.args.get('end')

        query = Task.query.filter_by(user_id=user_id)
        
        if start_date:
            query = query.filter(Task.deadline >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Task.deadline <= datetime.fromisoformat(end_date))
            
        tasks = query.all()

        tasks_data = []
        for task in tasks:
            tasks_data.append({
                'id': task.id,
                'title': task.title,
                'subject': task.subject,
                'completed': task.completed,
                'deadline': task.deadline.isoformat() if task.deadline else None,
                'created_at': task.created_at.isoformat()
            })
            
        return jsonify(tasks_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=8000)

