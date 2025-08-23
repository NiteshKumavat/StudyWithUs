import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- import navigate
import "./login.css";

const AuthForm = () => {
  document.title = "Login/Register - MyApp";
  const navigate = useNavigate("/dashboard"); 
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email address is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!isLogin) {
      if (!formData.name) {
        newErrors.name = 'Name is required';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const endpoint = isLogin ? "/login" : "/register";
      console.log(process.env.REACT_APP_API_URL)
      const response = await fetch(`${process.env.REACT_APP_API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...(!isLogin && { name: formData.name }),
          email: formData.email,
          password: formData.password
        })
      });
      console.log(response)
      const data = await response.json(); 

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      if (isLogin) {
        localStorage.setItem('authToken', data.token);
        console.log('Login successful:', data);
        navigate('/dashboard');
      } else {
        localStorage.setItem('authToken', data.token);
        console.log('Registration successful:', data);
        navigate('/dashboard');
        setIsLogin(true);
      }

      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('API Error:', error);
      setErrors(prev => ({
        ...prev,
        apiError: error.message || 'An unexpected error occurred'
      }));
    }
  };


  const toggleForm = () => {
    setIsLogin(!isLogin);
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    setErrors({});
  };

  return (
    <div className="auth-container">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-message">{errors.name}</span>}
          </div>
        )}

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={errors.password ? 'error' : ''}
          />
          {errors.password && <span className="error-message">{errors.password}</span>}
        </div>

        {!isLogin && (
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'error' : ''}
            />
            {errors.confirmPassword && (
              <span className="error-message">{errors.confirmPassword}</span>
            )}
          </div>
        )}

        {errors.apiError && (
          <div className="api-error">{errors.apiError}</div>
        )}

        <button type="submit" className="submit-btn">
          {isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      <div className="toggle-form">
        <p>
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button type="button" onClick={toggleForm} className="toggle-btn">
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};


export default AuthForm;
