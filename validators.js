// validators.js
const validator = {
  validateUserData(userData, isUpdate = false) {
    const errors = [];

    if (!isUpdate) {
      if (!userData.name || userData.name.trim() === '') {
        errors.push('Name is required');
      } else if (userData.name.length < 2 || userData.name.length > 100) {
        errors.push('Name must be between 2 and 100 characters');
      }

      if (!userData.email || userData.email.trim() === '') {
        errors.push('Email is required');
      } else if (!this.isValidEmail(userData.email)) {
        errors.push('Invalid email format');
      }
    } else {
      if (userData.name !== undefined && (userData.name.trim() === '' || userData.name.length < 2 || userData.name.length > 100)) {
        errors.push('Name must be between 2 and 100 characters');
      }
      
      if (userData.email !== undefined && !this.isValidEmail(userData.email)) {
        errors.push('Invalid email format');
      }
    }

    if (userData.age !== undefined) {
      if (typeof userData.age !== 'number' || userData.age < 0 || userData.age > 150) {
        errors.push('Age must be a number between 0 and 150');
      }
    }

    if (userData.city !== undefined && userData.city.length > 100) {
      errors.push('City name must be less than 100 characters');
    }

    return errors;
  },

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return emailRegex.test(email);
  },

  validateId(id) {
    const parsedId = parseInt(id);
    if (isNaN(parsedId) || parsedId <= 0) {
      return { valid: false, error: 'Invalid user ID' };
    }
    return { valid: true, id: parsedId };
  }
};

module.exports = validator;