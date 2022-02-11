import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from 'app/core/auth.service';
import { AppConfigService } from 'app/services/app-config.service';
import { LoggerService } from 'app/services/logger/logger.service';
import { UsersService } from 'app/services/users.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UploadImageService } from 'app/services/upload-image.service';
import { UploadImageNativeService } from 'app/services/upload-image-native.service';
import { WsRequestsService } from 'app/services/websocket/ws-requests.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotifyService } from '../../core/notify.service';

// import { slideInOutAnimation } from '../../../_animations/index';
@Component({
  selector: 'appdashboard-sidebar-user-details',
  templateUrl: './sidebar-user-details.component.html',
  styleUrls: ['./sidebar-user-details.component.scss'],

})
export class SidebarUserDetailsComponent implements OnInit {
  @Input() HAS_CLICKED_OPEN_USER_DETAIL: boolean = false;
  @Output() onCloseUserDetailsSidebar = new EventEmitter();
  @Input() _prjct_profile_name: string;
  @Input() plan_subscription_is_active: boolean
  @Input() plan_name: string;
  @Input() plan_type: string;

  flag_url: string;
  dsbrd_lang: string;
  user: any;
  browserLang: string;
  tlangparams: any;
  projectId: string;

  UPLOAD_ENGINE_IS_FIREBASE: boolean;
  storageBucket: string;
  baseUrl: string;
  imageUrl: any;

  IS_AVAILABLE: boolean;
  IS_BUSY: boolean;
  USER_ROLE: string;
  userProfileImageExist: boolean;
  userImageHasBeenUploaded: boolean;
  timeStamp: any;
  userProfileImageurl: string;
  project; any
  private wasInside = false;
  private unsubscribe$: Subject<any> = new Subject<any>();
  constructor(
    public auth: AuthService,
    private logger: LoggerService,
    private translate: TranslateService,
    private router: Router,
    public appConfigService: AppConfigService,
    private usersService: UsersService,
    public snackBar: MatSnackBar,
    private uploadImageService: UploadImageService,
    private uploadImageNativeService: UploadImageNativeService,
    public wsRequestsService: WsRequestsService,
    private eRef: ElementRef,
    private notify: NotifyService
  ) { }


  ngOnInit() {
    console.log('HELLO SIDEBAR-USER-DETAILS')
    this.getLoggedUserAndCurrentDshbrdLang();
    this.getCurrentProject();
    this.getProfileImageStorage();
    this.getUserAvailability();
    this.getUserUserIsBusy();
    this.checkUserImageExist();
    this.hasChangedAvailabilityStatusInUsersComp();
    this.checkUserImageUploadIsComplete();
    this.listenHasDeleteUserProfileImage();
    this.getUserRole();

  }

  logout() {
    this.closeUserDetailSidePanel()
    this.notify.presentLogoutModal()
  }


  getUserRole() {
    this.usersService.project_user_role_bs
      .pipe(
        takeUntil(this.unsubscribe$)
      )
      .subscribe((userRole) => {

        this.logger.log('[SIDEBAR-USER-DETAILS] - SUBSCRIPTION TO USER ROLE »»» ', userRole)
        // used to display / hide 'WIDGET' and 'ANALITCS' in home.component.html
        this.USER_ROLE = userRole;
      })
  }


  @HostListener('document:click', ['$event'])
  clickout(event) {
    console.log('[SIDEBAR-USER-DETAILS] clickout event.target)', event.target)
    console.log('[SIDEBAR-USER-DETAILS] clickout event.target)', event.target.id)
    const clicked_element_id = event.target.id
    if (this.eRef.nativeElement.contains(event.target)) {


      console.log('[SIDEBAR-USER-DETAILS] clicked inside')
    } else {

      console.log('[SIDEBAR-USER-DETAILS] HAS_CLICKED_OPEN_USER_DETAIL ', this.HAS_CLICKED_OPEN_USER_DETAIL)
      if (this.HAS_CLICKED_OPEN_USER_DETAIL === true) {
        if (!clicked_element_id.startsWith("sidebaravatar")) {
          this.closeUserDetailSidePanel();
        }
        console.log('[SIDEBAR-USER-DETAILS] clicked outside')
      }
    }
  }



  // @HostListener('click')
  // clickInside() {
  //   console.log('[SIDEBAR-USER-DETAILS] clicked inside')
  //   this.wasInside = true;
  // }

  // @HostListener('document:click')
  // clickout() {
  //   if (!this.wasInside) {
  //     console.log('[SIDEBAR-USER-DETAILS] clicked outside')
  //     // this.closeUserDetailSidePanel();
  //   }
  //   this.wasInside = false;
  // }


  hasChangedAvailabilityStatusInUsersComp() {
    this.usersService.has_changed_availability_in_users.subscribe((has_changed_availability) => {
      this.logger.log('[SIDEBAR] SUBSCRIBES TO HAS CHANGED AVAILABILITY FROM THE USERS COMP', has_changed_availability)

      if (this.project) {
        this.getProjectUser()
      }
      // this.getWsCurrentUserAvailability$()
    })
  }

  getProjectUser() {
    this.logger.log('[SIDEBAR-USER-DETAILS]  !!! SIDEBAR CALL GET-PROJECT-USER')
    this.usersService.getProjectUserByUserId(this.user._id).subscribe((projectUser: any) => {

      this.logger.log('[SIDEBAR-USER-DETAILS] PROJECT-USER GET BY USER-ID - PROJECT-ID ', this.projectId);
      this.logger.log('[SIDEBAR-USER-DETAILS] PROJECT-USER GET BY USER-ID - CURRENT-USER-ID ', this.user._id);
      this.logger.log('[SIDEBAR-USER-DETAILS] PROJECT-USER GET BY USER-ID - PROJECT USER ', projectUser);
      this.logger.log('[SIDEBAR-USER-DETAILS] PROJECT-USER GET BY USER-ID - PROJECT USER LENGTH', projectUser.length);
      if ((projectUser) && (projectUser.length !== 0)) {
        // this.logger.log('[SIDEBAR] PROJECT-USER ID ', projectUser[0]._id)
        // this.logger.log('[SIDEBAR] USER IS AVAILABLE ', projectUser[0].user_available)
        // this.logger.log('[SIDEBAR] USER IS BUSY (from db)', projectUser[0].isBusy)
        // this.user_is_available_bs = projectUser.user_available;

        // NOTE_nk: comment this this.subsTo_WsCurrentUser(projectUser[0]._id)
        this.subsTo_WsCurrentUser(projectUser[0]._id)

        if (projectUser[0].user_available !== undefined) {
          this.usersService.user_availability(projectUser[0]._id, projectUser[0].user_available, projectUser[0].isBusy)
        }

        // ADDED 21 AGO
        if (projectUser[0].role !== undefined) {
          this.logger.log('[SIDEBAR-USER-DETAILS] GET PROJECT USER ROLE FOR THE PROJECT ', this.projectId, ' »» ', projectUser[0].role);

          // ASSIGN THE projectUser[0].role VALUE TO USER_ROLE
          this.USER_ROLE = projectUser[0].role;

          // SEND THE ROLE TO USER SERVICE THAT PUBLISH
          this.usersService.user_role(projectUser[0].role);

        }
      } else {
        // this could be the case in which the current user was deleted as a member of the current project
        this.logger.log('[SIDEBAR-USER-DETAILS] PROJECT-USER UNDEFINED ')
      }

    }, (error) => {
      this.logger.error('[SIDEBAR-USER-DETAILS] PROJECT-USER GET BY PROJECT-ID & CURRENT-USER-ID  ', error);
    }, () => {
      this.logger.log('[SIDEBAR-USER-DETAILS] PROJECT-USER GET BY PROJECT ID & CURRENT-USER-ID  * COMPLETE *');
    });
  }


  subsTo_WsCurrentUser(currentuserprjctuserid) {
    this.logger.log('[SIDEBAR-USER-DETAILS] - SUBSCRIBE TO WS CURRENT-USER AVAILABILITY  prjct user id of current user ', currentuserprjctuserid);
    // this.usersService.subscriptionToWsCurrentUser(currentuserprjctuserid);
    this.wsRequestsService.subscriptionToWsCurrentUser(currentuserprjctuserid);

    this.getWsCurrentUserAvailability$();
    this.getWsCurrentUserIsBusy$();
  }

  getWsCurrentUserAvailability$() {
    // this.usersService.currentUserWsAvailability$
    this.wsRequestsService.currentUserWsAvailability$
      .pipe(
        takeUntil(this.unsubscribe$)
      )
      .subscribe((currentuser_availability) => {
        this.logger.log('[SIDEBAR] - GET WS CURRENT-USER AVAILABILITY - IS AVAILABLE? ', currentuser_availability);
        if (currentuser_availability !== null) {
          this.IS_AVAILABLE = currentuser_availability;

          // if (this.IS_AVAILABLE === true) {
          //     this.tooltip_text_for_availability_status = this.translate.instant('CHANGE_TO_YOUR_STATUS_TO_UNAVAILABLE')
          // } else {
          //     this.tooltip_text_for_availability_status = this.translate.instant('CHANGE_TO_YOUR_STATUS_TO_AVAILABLE')
          // }
        }
      }, error => {
        this.logger.error('[SIDEBAR-USER-DETAILS] - GET WS CURRENT-USER AVAILABILITY * error * ', error)
      }, () => {
        this.logger.log('[SIDEBAR-USER-DETAILS] - GET WS CURRENT-USER AVAILABILITY *** complete *** ')
      });
  }

  getWsCurrentUserIsBusy$() {
    // this.usersService.currentUserWsIsBusy$
    this.wsRequestsService.currentUserWsIsBusy$
      .pipe(
        takeUntil(this.unsubscribe$)
      )
      .subscribe((currentuser_isbusy) => {
        // this.logger.log('[SIDEBAR] - GET WS CURRENT-USER - currentuser_isbusy? ', currentuser_isbusy);
        if (currentuser_isbusy !== null) {
          this.IS_BUSY = currentuser_isbusy;
          // this.logger.log('[SIDEBAR] - GET WS CURRENT-USER (from ws)- this.IS_BUSY? ', this.IS_BUSY);
        }
      }, error => {
        this.logger.error('[SIDEBAR-USER-DETAILS] - GET WS CURRENT-USER IS BUSY * error * ', error)
      }, () => {
        this.logger.log('[SIDEBAR-USER-DETAILS] - GET WS CURRENT-USER IS BUSY *** complete *** ')
      });


  }



  checkUserImageExist() {
    this.usersService.userProfileImageExist.subscribe((image_exist) => {
      this.logger.log('[SIDEBAR-USER-DETAILS] - USER PROFILE EXIST ? ', image_exist);
      this.userProfileImageExist = image_exist;

      if (this.appConfigService.getConfig().uploadEngine === 'firebase') {
        if (this.storageBucket && this.userProfileImageExist === true) {
          this.logger.log('[SIDEBAR-USER-DETAILS] - USER PROFILE EXIST - BUILD userProfileImageurl');
          this.setImageProfileUrl(this.storageBucket)
        }
      } else {
        if (this.baseUrl && this.userProfileImageExist === true) {
          this.setImageProfileUrl_Native(this.baseUrl)
        }
      }
    });
  }

  setImageProfileUrl_Native(storage) {
    this.userProfileImageurl = storage + 'images?path=uploads%2Fusers%2F' + this.user._id + '%2Fimages%2Fthumbnails_200_200-photo.jpg';
    this.logger.log('[SIDEBAR-USER-DETAILS] PROFILE IMAGE (USER-PROFILE ) - userProfileImageurl ', this.userProfileImageurl);
    this.timeStamp = (new Date()).getTime();
  }

  setImageProfileUrl(storageBucket) {
    this.userProfileImageurl = 'https://firebasestorage.googleapis.com/v0/b/' + storageBucket + '/o/profiles%2F' + this.user._id + '%2Fphoto.jpg?alt=media';
    this.timeStamp = (new Date()).getTime();
  }

  getUserProfileImage() {
    if (this.timeStamp) {
      // this.logger.log('PROFILE IMAGE (USER-PROFILE IN SIDEBAR-COMP) - getUserProfileImage ', this.userProfileImageurl);
      return this.userProfileImageurl + '&' + this.timeStamp;
    }
    return this.userProfileImageurl
  }

  checkUserImageUploadIsComplete() {
    if (this.appConfigService.getConfig().uploadEngine === 'firebase') {
      this.uploadImageService.userImageWasUploaded.subscribe((image_exist) => {
        this.logger.log('[SIDEBAR-USER-DETAILS] - IMAGE UPLOADING IS COMPLETE ? ', image_exist, '(usecase Firebase)');
        this.userImageHasBeenUploaded = image_exist;
        if (this.storageBucket && this.userImageHasBeenUploaded === true) {
          this.logger.log('[SIDEBAR-USER-DETAILS] - IMAGE UPLOADING IS COMPLETE - BUILD userProfileImageurl ');
          this.setImageProfileUrl(this.storageBucket)
        }
      });
    } else {

      // NATIVE
      this.uploadImageNativeService.userImageWasUploaded_Native.subscribe((image_exist) => {
        this.logger.log('[SIDEBAR-USER-DETAILS] USER PROFILE IMAGE - IMAGE UPLOADING IS COMPLETE ? ', image_exist, '(usecase Native)');

        this.userImageHasBeenUploaded = image_exist;
        this.uploadImageNativeService.userImageDownloadUrl_Native.subscribe((imageUrl) => {
          this.userProfileImageurl = imageUrl
          this.timeStamp = (new Date()).getTime();
        })
      })
    }
  }

  listenHasDeleteUserProfileImage() {
    if (this.appConfigService.getConfig().uploadEngine === 'firebase') {
      this.uploadImageService.hasDeletedUserPhoto.subscribe((hasDeletedImage) => {
        this.logger.log('[SIDEBAR-USER-DETAILS] - hasDeletedImage ? ', hasDeletedImage, '(usecase Firebase)');
        this.userImageHasBeenUploaded = false
        this.userProfileImageExist = false
      });
    } else {
      this.uploadImageNativeService.hasDeletedUserPhoto.subscribe((hasDeletedImage) => {
        this.logger.log('[SIDEBAR-USER-DETAILS] - hasDeletedImage ? ', hasDeletedImage, '(usecase Native)');
        this.userImageHasBeenUploaded = false
        this.userProfileImageExist = false
      });
    }

  }

  getProfileImageStorage() {

    if (this.appConfigService.getConfig().uploadEngine === 'firebase') {
      this.UPLOAD_ENGINE_IS_FIREBASE = true
      const firebase_conf = this.appConfigService.getConfig().firebase;
      this.storageBucket = firebase_conf['storageBucket'];
      console.log('[SIDEBAR-USER-DETAILS] IMAGE STORAGE ', this.storageBucket, '(usecase Firebase)')

    } else {
      this.UPLOAD_ENGINE_IS_FIREBASE = false
      this.baseUrl = this.appConfigService.getConfig().SERVER_BASE_URL;

      console.log('[SIDEBAR-USER-DETAILS] IMAGE STORAGE ', this.baseUrl, 'usecase native')

    }
  }

  getCurrentProject() {
    // this.project = this.auth.project_bs.value;
    this.auth.project_bs.subscribe((project) => {
      if (project) {
        this.project = project
        this.projectId = project._id;
        console.log('[SIDEBAR-USER-DETAILS] projectId ', this.projectId);
        // this.projectName = project.name;
      }
    });
  }

  goToUserProfileLanguageSection() {
    this.router.navigate(['project/' + this.projectId + '/user-profile'], { fragment: 'language' });
    this.closeUserDetailSidePanel();
  }

  goToUserProfile() {
    this.router.navigate(['project/' + this.projectId + '/user-profile']);
    this.closeUserDetailSidePanel();
  }

  getLoggedUserAndCurrentDshbrdLang() {
    this.auth.user_bs.subscribe((user) => {
      this.logger.log('[SIDEBAR-USER-DETAILS] »»» »»» USER GET IN SIDEBAR-USER-DETAILS', user)
      // tslint:disable-next-line:no-debugger
      // debugger
      this.user = user;

      // GET ALL PROJECTS WHEN IS PUBLISHED THE USER
      if (this.user) {

        const stored_preferred_lang = localStorage.getItem(this.user._id + '_lang')

        if (stored_preferred_lang) {
          this.dsbrd_lang = stored_preferred_lang;
          console.log('[SIDEBAR-USER-DETAILS] - dsbrd_lang ', this.dsbrd_lang)
          this.getLangTranslation(this.dsbrd_lang)
          this.flag_url = "assets/img/language_flag/" + stored_preferred_lang + ".png"

          this.logger.log('[SIDEBAR-USER-DETAILS] flag_url (from stored_preferred_lang) ', this.flag_url)

          this.logger.log('[SIDEBAR-USER-DETAILS] stored_preferred_lang ', stored_preferred_lang)
        } else {
          this.browserLang = this.translate.getBrowserLang();
          this.dsbrd_lang = this.browserLang;
          this.getLangTranslation(this.dsbrd_lang)
          console.log('[SIDEBAR-USER-DETAILS] - dsbrd_lang ', this.dsbrd_lang)
          this.flag_url = "assets/img/language_flag/" + this.browserLang + ".png"

          console.log('[SIDEBAR-USER-DETAILS] flag_url (from browser_lang) ', this.flag_url)
        }
      }
    });
  }

  getLangTranslation(dsbrd_lang_code) {
    this.translate.get(dsbrd_lang_code)
      .subscribe((translation: any) => {
        this.logger.log('[SIDEBAR-USER-DETAILS] getLangTranslation', translation)
        this.tlangparams = { language_name: translation }
      });
  }

  ngOnChanges() {
    console.log('[SIDEBAR-USER-DETAILS] HAS_CLICKED_OPEN_USER_DETAIL', this.HAS_CLICKED_OPEN_USER_DETAIL)
    var element = document.getElementById('user-details');
    console.log('[SIDEBAR-USER-DETAILS] element', element)
    if (this.HAS_CLICKED_OPEN_USER_DETAIL === true) {
      element.classList.add("active");
    }
  }


  closeUserDetailSidePanel() {
    var element = document.getElementById('user-details');
    element.classList.remove("active");
    console.log('[SIDEBAR-USER-DETAILS] element', element)
    this.onCloseUserDetailsSidebar.emit(false);
  }


  getUserAvailability() {
    this.usersService.user_is_available_bs.subscribe((user_available) => {
      this.IS_AVAILABLE = user_available;
      console.log('[SIDEBAR-USER-DETAILS] - USER IS AVAILABLE ', this.IS_AVAILABLE);
    });
  }

  getUserUserIsBusy() {
    this.usersService.user_is_busy$.subscribe((user_isbusy) => {
      this.IS_BUSY = user_isbusy;
      // THE VALUE OS  IS_BUSY IS THEN UPDATED WITH THE VALUE RETURNED FROM THE WEBSOCKET getWsCurrentUserIsBusy$()
      // WHEN, FOR EXAMPLE IN PROJECT-SETTINGS > ADVANCED THE NUM OF MAX CHAT IS 3 AND THE 
      console.log('[SIDEBAR-USER-DETAILS] - USER IS BUSY (from db)', this.IS_BUSY);
    });
  }

  changeAvailabilityState(IS_AVAILABLE) {
    console.log('[SIDEBAR-USER-DETAILS] - CHANGE STATUS - USER IS AVAILABLE ? ', IS_AVAILABLE);

    this.usersService.updateCurrentUserAvailability(this.projectId, IS_AVAILABLE).subscribe((projectUser: any) => { // non 

      console.log('[SIDEBAR-USER-DETAILS] PROJECT-USER UPDATED ', projectUser)

      if (projectUser.user_available === false) {
        this.openSnackBar()
      }

      // NOTIFY TO THE USER SERVICE WHEN THE AVAILABLE / UNAVAILABLE BUTTON IS CLICKED
      this.usersService.availability_btn_clicked(true)

    }, (error) => {
      console.error('[SIDEBAR-USER-DETAILS] PROJECT-USER UPDATED ERR  ', error);
      // =========== NOTIFY ERROR ===========
      // this.notify.showNotification('An error occurred while updating status', 4, 'report_problem');
      // this.notify.showWidgetStyleUpdateNotification(this.changeAvailabilityErrorNoticationMsg, 4, 'report_problem');

    }, () => {
      console.log('[SIDEBAR-USER-DETAILS] PROJECT-USER UPDATED  * COMPLETE *');

      // =========== NOTIFY SUCCESS===========
      // this.notify.showNotification('status successfully updated', 2, 'done');
      // this.notify.showWidgetStyleUpdateNotification(this.changeAvailabilitySuccessNoticationMsg, 2, 'done');


      // this.getUserAvailability()
      // this.getProjectUser();
    });
  }
  openSnackBar() {
    let snackBarRef = this.snackBar.open('You are currently set to Unavailable and are not receiving new conversations', 'x', {
      duration: 9000,
      verticalPosition: 'top',
      horizontalPosition: 'center',
      panelClass: 'my-custom-snackbar',
    });

    snackBarRef.onAction().subscribe(() => this.snackBar.dismiss());
  }


}