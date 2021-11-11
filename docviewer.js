class DocumentViewer extends React.Component {
	constructor(props) {
  	super(props);
  	// Don't call this.setState() here!
  	this.state = {documents: [], chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", lookup: new Uint8Array(256), encryptionPsw: '', decryptionPsw: ''};
  	// this.handleClick = this.handleClick.bind(this);
		this.processFile = this.processFile.bind(this);
		this.saveFile = this.saveFile.bind(this);
		this.viewFile = this.viewFile.bind(this);
		this.deleteFile = this.deleteFile.bind(this);
		this.handleInputChange = this.handleInputChange.bind(this);
		this.updateDocumentList = this.updateDocumentList.bind(this);
	}
	
	componentDidMount() {
		let self = this;
  	axios.get(this.props.documentsUrl).then(function (response){
			self.logResponse(response);
  		self.setState({documents: response.data});
			self.setState({selectedDocument: self.state.documents[0]});
  	});
  }

  componentWillUnmount() {
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
		axios.get(this.state.selectedDocument).then((response) => {
			self.logResponse(response)
			let decrypted = JSON.parse(sjcl.decrypt(self.state.decryptionPsw, JSON.stringify(response.data)));
			switch (decrypted.type) {
				case 'application/pdf':
					let objectUrl =  window.URL.createObjectURL(new Blob([self.decode(decrypted.content)], {type: decrypted.type}));
				
					self.setState({documentSrc: objectUrl});
								
					break;
				default:
					let link = document.createElement('a');
					link.download = decrypted.name;
					link.target = '_blank';
					link.href = window.URL.createObjectURL(new Blob([this.decode(decrypted.content)], {
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
		var bytes = new Uint8Array(arraybuffer),
				i, len = bytes.length, base64 = "";
				
		for (i = 0; i < len; i += 3) {
			base64 += this.state.chars[bytes[i] >> 2];
			base64 += this.state.chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
			base64 += this.state.chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
			base64 += this.state.chars[bytes[i + 2] & 63];
		}

		if ((len % 3) === 2) {
			base64 = base64.substring(0, base64.length - 1) + "=";
		} else if (len % 3 === 1) {
			base64 = base64.substring(0, base64.length - 2) + "==";
		}

		return base64;
	}
	
	decode(base64) {
		var bufferLength = base64.length * 0.75,
				len = base64.length, i, p = 0,
				encoded1, encoded2, encoded3, encoded4;

		if (base64[base64.length - 1] === "=") {
			bufferLength--;
			if (base64[base64.length - 2] === "=") {
				bufferLength--;
			}
		}

		var arraybuffer = new ArrayBuffer(bufferLength),
				bytes = new Uint8Array(arraybuffer);

		for (i = 0; i < len; i += 4) {
			encoded1 = this.state.lookup[base64.charCodeAt(i)];
			encoded2 = this.state.lookup[base64.charCodeAt(i + 1)];
			encoded3 = this.state.lookup[base64.charCodeAt(i + 2)];
			encoded4 = this.state.lookup[base64.charCodeAt(i + 3)];

			bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
			bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
			bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
		}

		return arraybuffer;
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
            <button id="saveButton" className="button" onClick={this.saveFile}>Save</button>
          </div>
        </div>
        <div className="columns">
          <div className="column">
				  	<select className="input" id="documents" value={this.state.selectedDocument} name="selectedDocument" onChange={this.handleInputChange}>
							{this.state.documents.map((document) => <option key={document.value} value={document.value}>{document.name}</option>)}
						</select>
          </div>
					<div className="column is-1">
            <button className="button" type="button" target="_blank" onClick={this.deleteFile}>Delete</button>
          </div>
        </div>
				<div className="columns">
					<div className="column is-4">
         		<input className="input" type="password" placeholder="Insert password" value={this.state.decryptionPsw} name="decryptionPsw" onChange={this.handleInputChange}/>
          </div>
					 <div className="column is-1">
            <button className="button" type="button" target="_blank" onClick={this.viewFile}>View</button>
          </div>
				</div>
				<embed src={this.state.documentSrc} width="100%" height="600px" />
      </div>
    );
  }
}
          
ReactDOM.render(<DocumentViewer documentsUrl="https://jsonstorage.net/api/items/fa383df6-a968-4acb-be38-57868b6113f6" newDocumentUrl="https://api.jsonstorage.net/v1/json"/>, document.getElementById('root'));
