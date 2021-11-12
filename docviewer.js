class DocumentViewer extends React.Component {
	constructor(props) {
  	super(props);
  	// Don't call this.setState() here!
  	this.state = {documents: [], documentsUrl: '', encryptionPsw: '', decryptionPsw: ''};
  	// this.handleClick = this.handleClick.bind(this);
		this.processFile = this.processFile.bind(this);
		this.saveFile = this.saveFile.bind(this);
		this.viewFile = this.viewFile.bind(this);
		this.deleteFile = this.deleteFile.bind(this);
		this.loadDocuments = this.loadDocuments.bind(this);
		this.handleInputChange = this.handleInputChange.bind(this);
		// this.updateDocumentList = this.updateDocumentList.bind(this);
	}
	
	componentDidMount() {
  }

  componentWillUnmount() {
  }
	
	loadDocuments(e){
		let self = this;
  	axios.get(this.state.documentsUrl).then(function (response){
			self.logResponse(response);
  		self.setState({documents: response.data});
			self.setState({selectedDocument: self.state.documents[0].value});
  	});
	}

	processFile(event) {
    event.preventDefault();
    let reader = new FileReader();
		let self = this;
		reader.onload = (e) => {
			self.setState({file: {name: event.target.files[0].name, type: event.target.files[0].type, content: self.encode(e.target.result)}});
		}
		reader.readAsArrayBuffer(event.target.files[0]);
  }
	
	updateDocumentList(documents) {
		var self = this;
		axios.put(this.props.documentsUrl, documents, {
			headers: { 'Content-Type': 'application/json; charset=utf-8' }
		}).then((response) => {
			self.logResponse(response);
		});
	}
	
	saveFile(e) {
		let encrypted = sjcl.encrypt(this.state.encryptionPsw, JSON.stringify(this.state.file));
		let self = this;
		axios.post(this.props.newDocumentUrl, encrypted, {
				headers: { 'Content-Type': 'application/json; charset=utf-8' 
			}
		}).then((response) => {
			self.logResponse(response);
			self.setState(previousState => ({
    		documents: [...previousState.documents, {value: response.data.uri, name: self.state.file.name}]
			}));
			
			self.updateDocumentList(self.state.documents);

		}).catch((error) => {
			console.log(error);
		});
	}
	
	viewFile(e) {
		let self = this;
		axios.get(this.state.selectedDocument.value).then((response) => {
			self.logResponse(response)
			let decrypted = JSON.parse(sjcl.decrypt(self.state.decryptionPsw, JSON.stringify(response.data)));
			switch (decrypted.type) {
				case 'application/pdf':
					let objectUrl = window.URL.createObjectURL(new Blob([self.decode(decrypted.content)], {type: decrypted.type}));
				
					self.setState({documentSrc: objectUrl});
								
					break;
				default:
					let link = document.createElement('a');
					link.download = decrypted.name;
					link.target = '_blank';
					link.href = window.URL.createObjectURL(new Blob([self.decode(decrypted.content)], {
						type: decrypted.type
					}));
					link.click();
					break;
			}});
	}
	
	handleInputChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    });
  }
	
	deleteFile(e) {
		let self = this;
		axios.delete(this.state.selectedDocument).then((response) => {
			self.logResponse(response);
			let newDocumentList = self.state.documents.filter(function(document) { 
        return document.value !== self.state.selectedDocument
    	});

			self.setState({documents: newDocumentList});

			self.updateDocumentList(newDocumentList);
		});
	}
	
	encode(arraybuffer) {
		var binary = '';
		var bytes = new Uint8Array( arraybuffer );
		var len = bytes.byteLength;
		for (var i = 0; i < len; i++) {
			binary += String.fromCharCode( bytes[ i ] );
		}
		return window.btoa( binary );
	}
	
	decode(base64) {
		var binary_string =  window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array( len );
    for (var i = 0; i < len; i++)        {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
	}
	
	logResponse(response){
		let info = {
			'method': response.config.method,
			'url': response.config.url,
			'response': response.statusText
		}
		console.log(info);
	}
	
  render() {
    return (
    	<div  className="container">
        <div className="columns">
          <div className="column is-6">
         		<input className="input" id="file" type="file" onChange={this.processFile}/>
          </div>
					<div className="column is-5">
         		<input className="input" type="password" placeholder="Insert password" value={this.state.encryptionPsw} name="encryptionPsw" onChange={this.handleInputChange}/>
          </div>
          <div className="column is-1">
            <button id="saveButton" className="button" onClick={this.saveFile} disabled={!this.state.encryptionPsw}>Save</button>
          </div>
        </div>
				<div className="columns">
					<div className="column">
            <input className="input" placeholder="Insert document list storage" value={this.state.documentsUrl} name="documentsUrl" onChange={this.handleInputChange}/>
          </div>
					<div className="column is-1">
            <button className="button" type="button" disabled={!this.state.documentsUrl} onClick={this.loadDocuments}>Load</button>
          </div>
				</div>
        <div className="columns">
          <div className="column">
				  	<select className="input" id="documents" value={this.state.selectedDocument} name="selectedDocument" onChange={this.handleInputChange}>
							{this.state.documents.map((document) => <option key={document.value} value={document.value}>{document.name}</option>)}
						</select>
          </div>
					<div className="column is-1">
            <button className="button" type="button" target="_blank" onClick={this.deleteFile} disabled={!this.state.selectedDocument}>Delete</button>
          </div>
        </div>
				<div className="columns">
					<div className="column is-4">
         		<input className="input" type="password" placeholder="Insert password" value={this.state.decryptionPsw} name="decryptionPsw" onChange={this.handleInputChange}/>
          </div>
					 <div className="column is-1">
            <button className="button" type="button" target="_blank" onClick={this.viewFile} disabled={!this.state.decryptionPsw || !this.state.selectedDocument}>View</button>
          </div>
				</div>
				<embed src={this.state.documentSrc} width="100%" height="600px" />
      </div>
    );
  }
}
          
ReactDOM.render(<DocumentViewer newDocumentUrl="https://api.jsonstorage.net/v1/json"/>, document.getElementById('root'));
