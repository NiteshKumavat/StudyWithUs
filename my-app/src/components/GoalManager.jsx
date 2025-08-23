import "./Goals.css";
import { useState } from "react";

const GoalManager = () => {
  document.title = "Goal Manager"
  const [values, setValues] = useState({
    title: "",
    subject: "",
    description: "",
    deadline: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const enteredDate = new Date(values.deadline);
    
    if (!values.deadline || enteredDate < today) {
      setError("Please select a valid future date");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Authentication required");

      const response = await fetch(`${process.env.REACT_APP_API_URL}/task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(values)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create goal");
      }

      setValues({
        title: "",
        subject: "",
        description: "",
        deadline: ""
      });

      alert("Goal created successfully!");
      
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="goal-manager">
      <div className="create-goal-section">
        <h2>Create New Goal</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              name="title"
              placeholder="Title"
              onChange={handleChange}
              value={values.title}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="subject">Subject</label>
            <input
              id="subject"
              type="text"
              name="subject"
              placeholder="Enter your subject"
              onChange={handleChange}
              value={values.subject}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows="4"
              placeholder="Write your goal description..."
              onChange={handleChange}
              value={values.description}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="deadline">Deadline</label>
            <input
              id="deadline"
              type="date"
              name="deadline"
              onChange={handleChange}
              value={values.deadline}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <button 
            type="submit" 
            className="create-button"

          >
            {isSubmitting ? "Creating..." : "Create Goal"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default GoalManager;
