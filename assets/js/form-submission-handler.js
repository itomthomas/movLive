(function() {
  // get all data in form and return object
  function getFormData(form) {
    var elements = form.elements;
    var honeypot;
    //elements[k].getAttribute('data-rule')
    var fields = Object.keys(elements).filter(function(k) {
      if (elements[k].name === "honeypot") {
        honeypot = elements[k].value;
        return false;
      }
      return true;
    }).map(function(k) {
      if(elements[k].name !== undefined) {
        return elements[k].name;
      // special case for Edge's html collection
      }else if(elements[k].length > 0){
        return elements[k].item(0).name;
      }
    }).filter(function(item, pos, self) {
      return self.indexOf(item) == pos && item;
    });
        
    var formData = {};
    fields.forEach(function(name){
      var element = elements[name];
      
      // singular form elements just have one value
      formData[name] = element.value;

      // when our element has multiple items, get their values
      if (element.length) {
        var data = [];
        for (var i = 0; i < element.length; i++) {
          var item = element.item(i);
          if (item.checked || item.selected) {
            data.push(item.value);
          }
        }
        formData[name] = data.join(', ');
      }
    });

    // add form-specific values into the data
    formData.formDataNameOrder = JSON.stringify(fields);
    formData.formGoogleSheetName = form.dataset.sheet || "responses"; // default sheet name
    formData.formGoogleSendEmail
      = form.dataset.email || ""; // no email by default

    return {data: formData, honeypot: honeypot};
  }

  function handleFormSubmit(event) {  // handles form submit without any jquery
    event.preventDefault();           // we are submitting via xhr below
    var form = event.target;
    
    // Tom --- custom validations based on data-rule attributes
    const vald_errors = [0,0,0,0,0] //initial values for five fields
    var elements = form.elements;
    Object.keys(elements).forEach(key => {
      const fieldValue = elements[key].value;
      const fieldType = elements[key];
      const fieldName = elements[key].name;
      //console.log(`FormElements = ${key}: ${fieldValue} : ${fieldName} : ${fieldType}`);
      
      elements[key].classList.remove("is-invalid"); // Removes any existing validation error text for every input field.
      elements[key].classList.add("is-valid");
    //var fieldValue = elements[k].value
    //console.log(elements[k].name)
 
    //if (elements[key].name !== ''){ var rule = elements[key].getAttribute('data-rule') }
    var rule = elements[key].getAttribute('data-rule') 
    //console.log("RULE = " + rule);
    
    emailExp = /^[^\s()<>@,;:\/]+@\w[\w\.-]+\.[a-z]{2,}$/i;

    if (rule !== null) {
      var pos = rule.indexOf(':', 0);
      if (pos >= 0) {
        var exp = rule.substr(pos + 1, rule.length);
        rule = rule.substr(0, pos);
      } else {
        rule = rule.substr(pos + 1, rule.length);
      }

      switch (rule) {
        case 'required':
          if (fieldValue === '') {
            
            vald_errors[0] = 1; 
          }
          break;

        case 'minlen':
          if (fieldValue.length !== 0 ) {  // if user did not enter anything, don't check
            if (fieldValue.length < parseInt(exp)) {
              
              if(fieldName === 'fullname') { vald_errors[0] = 1; }
              if(fieldName === 'message') { vald_errors[4] = 1; }
              if(fieldName === 'location') { vald_errors[2] = 1; }
              if(fieldName === 'mobile') { vald_errors[3] = 1; }
              elements[key].classList.remove("is-valid");
              elements[key].classList.add("is-invalid");
            }
          }
          break;

        case 'email':
          if (fieldValue.length !== 0 ) {  // if user did not enter anything, don't check
            if (!emailExp.test(fieldValue)) {
              if(fieldName === 'email') { 
                vald_errors[1] = 1; 
                elements[key].classList.remove("is-valid");
                elements[key].classList.add("is-invalid");
              }
            }
          }
          break;

        case 'checked':
          if (! elements[key].is(':checked')) {
            vald_errors[0] = 1;
            elements[key].classList.remove("is-valid");
            elements[key].classList.add("is-invalid");
          }
          break;

        case 'regexp':
          exp = new RegExp(exp);
          if (!exp.test(fieldValue)) {
            elements[key].classList.remove("is-valid");
            elements[key].classList.add("is-invalid");
            vald_errors[0] = 1;
          }
          break;
      }        
    }

  }); // For loop ends
    // Tom --- custom validations END here
    //console.log("vald_errors = " + vald_errors + "  ==   " + vald_errors.includes(1));
    if(!vald_errors.includes(1)){ // when there are no validation errors, submit.
      clearValidationErrors(form);
      //console.log("Submitting form")
      var formData = getFormData(form);
      var data = formData.data;

      // If a honeypot field is filled, assume it was done so by a spam bot.
      if (formData.honeypot) {
        return false;
      }
      form.querySelector('.loading').classList.add('d-block'); // starts showing loading icon
      disableAllButtons(form);
      var url = form.action;
      var xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      // xhr.withCredentials = true;
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
      xhr.onreadystatechange = function() {
          if (xhr.readyState === 4 && xhr.status === 200) {
            form.reset();
            var formElements = form.querySelector(".form-elements")
            if (formElements) {
              formElements.style.display = "none"; // hide form
            }
            var thankYouMessage = form.querySelector(".thankyou_message");
            
            if (thankYouMessage) {
              thankYouMessage.style.display = "block";
            }
            form.querySelector('.loading').classList.remove('d-block'); // stops showing loading icon
          }
      };
      // url encode form data for sending as post data
      var encoded = Object.keys(data).map(function(k) {
          return encodeURIComponent(k) + "=" + encodeURIComponent(data[k]);
      }).join('&');
      xhr.send(encoded);
    }
    else{
      // if there are errors and we spotted it, reset the array for next check.
      vald_errors[0] = 0;
      vald_errors[1] = 0;
      vald_errors[2] = 0;
      vald_errors[3] = 0;
      vald_errors[4] = 0;
    }
  }
  
  function loaded() {
    // bind to the submit event of our form
    var forms = document.querySelectorAll("form.gform");
    for (var i = 0; i < forms.length; i++) {
      forms[i].addEventListener("submit", handleFormSubmit, false);
    }
  };
  
  document.addEventListener("DOMContentLoaded", loaded, false);
  
  function disableAllButtons(form) {
    var buttons = form.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].disabled = true;
    }
  }
  
  function clearValidationErrors(form) {
    // ---Created by Tom - Function developed for validation errors.
    var fields = form.querySelectorAll("input");
    var parafield = form.querySelectorAll("textarea");
    for (var i = 0; i < fields.length; i++) {
      fields[i].classList.remove("is-invalid");
      fields[i].classList.add("is-valid");
    }
    for (var i = 0; i < parafield.length; i++) {
      parafield[i].classList.remove("is-invalid");
      parafield[i].classList.add("is-valid");
    }
  }
})();
