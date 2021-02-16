import React from 'react';
import autoBind from 'react-autobind';
import alertify from 'alertifyjs';
import Select from 'react-select';
import ToggleSwitch from 'js/components/toggleSwitch';
import TextBox from 'js/components/textBox';
import {actions} from '../../actions';
import {bem} from 'js/bem';

/*
 * Modal for connecting project data
 */
class ConnectProjects extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      // For loading
      isVirgin: true,
      isLoading: false,
      // `data_sharing` is an empty object if never enabled before
      isShared: props.asset.data_sharing?.enabled || false,
      attachedParents: [],
      sharingEnabledAssets: null,
      newParentUrl: '',
      newFilename: '',
    };

    autoBind(this);
  }

  /*
   * Setup
   */

  componentDidMount() {
    this.refreshAttachmentList();
    actions.dataShare.getSharingEnabledAssets();

    actions.dataShare.attachToParent.completed.listen(
      this.refreshAttachmentList
    );
    actions.dataShare.detachParent.completed.listen(
      this.refreshAttachmentList
    );
    actions.dataShare.getSharingEnabledAssets.completed.listen(
      this.onGetSharingEnabledAssetsCompleted
    );
    actions.dataShare.getAttachedParents.completed.listen(
      this.onGetAttachedParentsCompleted
    );
    actions.dataShare.toggleDataSharing.completed.listen(
      this.onToggleDataSharingCompleted
    );
  }

  /*
   * `actions` Listeners
   */

  onGetAttachedParentsCompleted(response) {
    this.setState({
      isVirgin: false,
      isLoading: false,
      attachedParents: response,
    });
  }
  onGetSharingEnabledAssetsCompleted(response) {
    this.setState({sharingEnabledAssets: response});
  }
  onToggleDataSharingCompleted() {
    this.setState({isShared: !this.state.isShared});
  }
  refreshAttachmentList() {
    actions.dataShare.getAttachedParents(this.props.asset.uid);
  }


  /*
   * UI Listeners
   */

  confirmAttachment() {

    let parentUrl = this.state.newParentUrl;
    let filename = this.state.newFilename;
    if (filename !== '' && parentUrl !== '') {
      this.setState({isLoading: true});

      var data = JSON.stringify({
        parent: parentUrl,
        fields: [],
        filename: filename,
      });
      actions.dataShare.attachToParent(this.props.asset.uid, data);
    } else {
      // TODO TextBox errors
      alertify.error(t('An `xml-external` question must exist in form'));
    }
  }
  onParentChange(newVal) {
    this.setState({newParentUrl: newVal.url});
  }
  onFilenameChange(newVal) {
    this.setState({newFilename: newVal});
  }
  removeAttachment(newVal) {
    this.setState({isLoading: true})
    actions.dataShare.detachParent(newVal);
  }

  /*
   * Utilities
   */

  toggleSharingData() {
    var data = JSON.stringify({
      data_sharing: {
        enabled: !this.state.isShared
      }
    });

    if (!this.state.isShared) {
      let dialog = alertify.dialog('confirm');
      let opts = {
        title: `${t('Privacy Notice')}`,
        message: t('This will attach the full dataset from \"##ASSET_NAME##\" as a background XML file to this form. While not easily visbable, it is technically possible for anyone entering data to your form to retrieve and view this dataset. Do not use this feature if \"##ASSET_NAME##\" includes sensative data.').replaceAll('##ASSET_NAME##', this.props.asset.name),
        labels: {ok: t('Acknowledge and continue'), cancel: t('Cancel')},
        onok: (evt, value) => {
          actions.dataShare.toggleDataSharing(this.props.asset.uid, data);
          dialog.destroy();
        },
        oncancel: () => {
          dialog.destroy();
        }
      };
      dialog.set(opts).show();
    } else {
      actions.dataShare.toggleDataSharing(this.props.asset.uid, data);
    }
  }

 /* May be useful later, but now we make users specify filename
  * getExteralFilename() {
  *   let filename = '';
  *   this.props.asset.content.survey.some((element) => {
  *     if (element.type === XML_EXTERNAL) {
  *       filename = element.name;
  *     }
  *   });
  *   return filename;
  * }
  */

  /*
   * Rendering
   */

  renderLoading(message = t('loading…')) {
    return (
      <bem.Loading>
        <bem.Loading__inner>
          <i />
          {message}
        </bem.Loading__inner>
      </bem.Loading>
    );
  }

  renderSwitchLabel() {
    if (this.state.isShared) {
      return (
        <ToggleSwitch
          onChange={this.toggleSharingData.bind(this)}
          label={t('Data sharing enabled')}
          checked={this.state.isShared}
        />
      );
    } else {
      return (
        <ToggleSwitch
          onChange={this.toggleSharingData.bind(this)}
          label={t('Data sharing disabled')}
          checked={this.state.isShared}
        />
      );
    }
  }

  render() {
    const sharingEnabledAssets = this.state.sharingEnabledAssets?.results;

    return (
      <bem.FormModal__form
        className='project-settings project-settings--upload-file connect-projects'
        onSubmit={this.confirmAttachment}
      >
        {/* Enable data sharing */}
        <bem.FormModal__item m='data-sharing'>
          <div className='connect-projects-header'>
            <i className="k-icon k-icon-folder-out"/>
            <h2>{t('Share data with other project forms')}</h2>
          </div>
          <p>
            {t('You can open this project to make the data collected here available in other forms. This data will be dynamic and will update automatically in the new forms you link when anything is modified in this project. You can change this at any time and customize who has access to this data.')}
          </p>
          {this.renderSwitchLabel()}
        </bem.FormModal__item>

        {/* Attach other projects data */}
        <bem.FormModal__item m='import-data'>
          <div className='connect-projects-header'>
            <i className="k-icon k-icon-folder-in"/>
            <h2>{t('Import other project data')}</h2>
          </div>
          <p>
            {t('You can also link available projects to this form, permitting data coming from the new proejct to be available in the form builder. In order to do this, you will need to introduce the appropriate code in the desired questions. You can learn more about it ')}
            <a href='#'>here</a>
            {t('.')}
          </p>
          {/* Selecting project form*/}
          {(this.state.isVirgin || !sharingEnabledAssets) &&
            <div className='import-data-form'>
              {this.renderLoading(t('Loading sharing enabled projects'))}
            </div>
          }
          {sharingEnabledAssets &&
            <div className='import-data-form'>
              <Select
                placeholder={t('Select a different project to import data from')}
                options={sharingEnabledAssets}
                getOptionLabel={option => option.name}
                getOptionValue={option => option.url}
                onChange={this.onParentChange}
                className='kobo-select'
                classNamePrefix='kobo-select'
              />
              <TextBox
                placeholder={t('Give a unique name to the import')}
                onChange={this.onFilenameChange}
              />
              <bem.KoboButton
                m='blue'
              >
                {t('Import')}
              </bem.KoboButton>
            </div>
          }

          {/* Display attached projects */}
          <ul>
            <label>{t('Imported')}</label>
            {(this.state.isVirgin || this.state.isLoading) &&
              <div className='imported-item'>
                {this.renderLoading(t('Loading imported projects'))}
              </div>
            }
            {!this.state.isLoading && this.state.attachedParents.length == 0 &&
              <li className='no-imports'>
                {t('No data imported')}
              </li>
            }
            {!this.state.isLoading && this.state.attachedParents.length > 0 &&
                this.state.attachedParents.map((item, n) => {
                  return (
                    <li key={n} className='imported-item'>
                      <i className="k-icon k-icon-check"/>
                      <div className='imported-names'>
                        <span className='imported-filename'>{item.filename}</span>
                        <span className='imported-parent'>{item.parent.name}</span>
                      </div>
                      <i
                        className="k-icon-trash"
                        onClick={() => this.removeAttachment(item.attachmentUrl)}
                      />
                    </li>
                  );
                })
            }
          </ul>
        </bem.FormModal__item>

      </bem.FormModal__form>
    );
  }
}

export default ConnectProjects;
